import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const movDetailSchema = z.object({
  linea: z.string(),
  sucursal_id: z.number(),
  almacen_id: z.number(),
  estado_stock_id: z.number(),
  numero_lote: z.string().nullable().optional(),
  material_id: z.number().nullable().optional(),
  material_codigo: z.string().nullable().optional(),
  unidad_medida_id: z.number().nullable().optional(),
  cantidad: z.number(),
  costo_unit: z.number().nullable().optional(),
  sucursal_dst_id: z.number().nullable().optional(),
  almacen_dst_id: z.number().nullable().optional(),
  esquema_id: z.number().nullable().optional(),
  distribuciones: z.array(z.object({
    numero_lote: z.string().nullable().optional(),
    fecha_expiracion: z.string().nullable().optional(),
    ubicacion_id: z.number().nullable().optional(),
    cantidad: z.number(),
  })).default([]),
});

const movSchema = z.object({
  sucursal_id: z.number(),
  tipo_operacion_id: z.number(),
  documento: z.string().nullable().optional(),
  referencia: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  cliente_id: z.number().nullable().optional(),
  proveedor_id: z.number().nullable().optional(),
  numero_pedido: z.string().nullable().optional(),
  detalles: z.array(movDetailSchema),
});

function generateMovNumber() {
  return `MOV-${Date.now()}`;
}

export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireAuth(req);
    const { searchParams } = req.nextUrl;

    const id = searchParams.get('id');
    if (id) {
      const mov = await prisma.movimientoAlmacen.findUnique({
        where: { id: Number(id), empresa_id: empresaId },
        include: {
          tipo_operacion: true,
          sucursal: true,
          proveedor: true,
          cliente: true,
          detalles: {
            include: {
              material: true,
              estado_stock: true,
              distribuciones: {
                include: {
                  ubicacion: true
                }
              }
            }
          }
        }
      });
      return NextResponse.json({ data: mov });
    }

    const page = parseInt(searchParams.get('page') ?? '1');
    const pageSize = parseInt(searchParams.get('pageSize') ?? '10');
    const search = searchParams.get('search') ?? '';
    const sucursalId = searchParams.get('sucursalId');

    const where = {
      empresa_id: empresaId,
      ...(sucursalId ? { sucursal_id: parseInt(sucursalId) } : {}),
      ...(search ? {
        OR: [
          { numero_mov: { contains: search, mode: 'insensitive' as const } },
          { documento: { contains: search, mode: 'insensitive' as const } },
          { referencia: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}),
    };

    const [total, movimientos] = await Promise.all([
      prisma.movimientoAlmacen.count({ where }),
      prisma.movimientoAlmacen.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          tipo_operacion: { select: { codigo: true, descripcion: true, signo_origen: true } },
          sucursal: { select: { descripcion: true } },
          _count: { select: { detalles: true } }
        }
      }),
    ]);

    return NextResponse.json({
      data: movimientos,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (err) {
    console.error('[GET /api/almacen] Error:', err);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    const empresaId = Number(payload.empresaId);
    const userId = Number(payload.userId);

    if (isNaN(empresaId) || isNaN(userId)) {
      throw new Error('Sesión inválida: empresa_id o user_id no encontrados');
    }

    const body = await req.json();
    const { detalles, ...movData } = movSchema.parse(body);

    const movimiento = await prisma.$transaction(async (tx: any) => {
      // Find a default location for fallback
      const defaultUbicacion = await tx.ubicacion.findFirst({
        where: { empresa_id: empresaId, activo: true },
        orderBy: { id: 'asc' }
      });

      if (!defaultUbicacion && detalles.some(d => d.distribuciones.length === 0)) {
        throw new Error('No se encontró una ubicación por defecto para la empresa. Por favor cree al menos una ubicación.');
      }

      // 1. Resolve material_id and fetch details
      const resolvedDetalles = await Promise.all(detalles.map(async (d) => {
        let material;
        if (d.material_id) {
          material = await tx.material.findUnique({
            where: { id: d.material_id },
            include: { unidad_medida_rel: true, esquemas: { where: { activo: 1 } } }
          });
        } else if (d.material_codigo) {
          material = await tx.material.findUnique({
            where: { empresa_id_codigo: { empresa_id: empresaId, codigo: d.material_codigo } },
            include: { unidad_medida_rel: true, esquemas: { where: { activo: 1 } } }
          });
        }
        if (!material) throw new Error(`Material ${d.material_codigo || d.material_id} no encontrado`);

        const esquemaId = d.esquema_id || material.esquema_id || (material as any).esquemas?.[0]?.esquema_id;

        return { ...d, material_id: material.id, material: material, esquema_id_calculado: esquemaId };
      }));

      const tipoOp = await tx.tipoOperacion.findUnique({
        where: { id: movData.tipo_operacion_id }
      });
      if (!tipoOp) throw new Error('Tipo de operación no encontrado');

      if (tipoOp.requiere_pedido && !movData.numero_pedido) {
        throw new Error('Debe proporcionar el número de pedido para este tipo de operación');
      }

      // 2. Create Movement Header
      const mov = await tx.movimientoAlmacen.create({
        data: {
          sucursal: { connect: { id: movData.sucursal_id } },
          tipo_operacion: { connect: { id: movData.tipo_operacion_id } },
          documento: movData.documento,
          referencia: movData.referencia,
          observaciones: movData.observaciones,
          ...(movData.cliente_id ? { cliente: { connect: { id: movData.cliente_id } } } : {}),
          ...(movData.proveedor_id ? { proveedor: { connect: { id: movData.proveedor_id } } } : {}),
          numero_pedido: movData.numero_pedido || null,
          empresa: { connect: { id: empresaId } },
          numero_mov: generateMovNumber(),
          created_by: userId,
          detalles: {
            create: resolvedDetalles.map((d) => ({
              linea: d.linea,
              sucursal_id: d.sucursal_id,
              almacen_id: d.almacen_id,
              estado_stock: { connect: { id: d.estado_stock_id } },
              numero_lote: d.numero_lote,
              material: { connect: { id: d.material_id } },
              unidad_medida: { connect: { id: d.material.unidad_medida_id } },
              cantidad: d.cantidad,
              costo_unit: d.costo_unit,
              sucursal_dst_id: d.sucursal_dst_id ?? null,
              almacen_dst_id: d.almacen_dst_id ?? null,
              ...(d.esquema_id_calculado ? { esquema: { connect: { id: d.esquema_id_calculado } } } : {}),
              created_by: userId,
              distribuciones: {
                create: d.distribuciones.map(dist => ({
                  empresa: { connect: { id: empresaId } },
                  numero_lote: dist.numero_lote,
                  fecha_expiracion: dist.fecha_expiracion ? new Date(dist.fecha_expiracion) : null,
                  ubicacion: { connect: { id: dist.ubicacion_id && dist.ubicacion_id > 0 ? dist.ubicacion_id : defaultUbicacion?.id } },
                  cantidad: dist.cantidad,
                  created_by: userId
                }))
              }
            }))
          }
        }
      });

// 3. Update stocks and costs
      const actualizaCosto = tipoOp.actualiza_costo;
      const signoEfectivo = tipoOp.signo_origen || tipoOp.signo_destino;

      for (const d of resolvedDetalles) {
        const material = d.material;
        const unidadMedidaControl = material.unidad_medida_id;

        let cantidadBase: number;

        if (d.unidad_medida_id && d.unidad_medida_id !== unidadMedidaControl) {
          const presentacion = await tx.materialPresentacion.findFirst({
            where: {
              material_id: d.material_id,
              unidad_medida_id: d.unidad_medida_id,
              activo: true
            }
          });
          if (presentacion) {
            const um = await tx.unidadMedida.findUnique({
              where: { id: d.unidad_medida_id }
            });
            if (um) {
              cantidadBase = Number(d.cantidad) * Number(um.unidad_multiplo || 1);
            } else {
              cantidadBase = Number(d.cantidad);
            }
          } else {
            cantidadBase = Number(d.cantidad);
          }
        } else {
          cantidadBase = Number(d.cantidad);
        }

        const currentStockTotal = await tx.stockMaterial.aggregate({
          where: {
            empresa_id: empresaId,
            sucursal_id: d.sucursal_id,
            almacen_id: d.almacen_id,
            estado_stock_id: d.estado_stock_id,
            material_id: d.material_id!,
            unidad_medida_id: unidadMedidaControl,
          },
          _sum: { cantidad: true }
        });
        const stockAnt = Number(currentStockTotal._sum.cantidad || 0);

        const itemsToUpdate = d.distribuciones.length > 0
          ? d.distribuciones.map(dist => ({
            almacen_id: d.almacen_id,
            ubicacion_id: dist.ubicacion_id || defaultUbicacion?.id || 0,
            numero_lote: dist.numero_lote,
            cantidad: dist.cantidad,
            fecha_expiracion: dist.fecha_expiracion
          }))
          : [{
            almacen_id: d.almacen_id,
            ubicacion_id: defaultUbicacion?.id || 0,
            numero_lote: d.numero_lote,
            cantidad: d.cantidad,
            fecha_expiracion: null
          }];

        for (const item of itemsToUpdate) {
          const balanceQty = signoEfectivo === '+' ? cantidadBase : signoEfectivo === '-' ? -cantidadBase : 0;

          if (item.numero_lote) {
            await tx.lote.upsert({
              where: {
                empresa_id_material_id_numero_lote: {
                  empresa_id: empresaId,
                  material_id: d.material_id!,
                  numero_lote: item.numero_lote
                }
              },
              update: {
                fecha_expiracion: item.fecha_expiracion ? new Date(item.fecha_expiracion) : undefined,
                proveedor_id: movData.proveedor_id || undefined
              },
              create: {
                empresa_id: empresaId,
                material_id: d.material_id!,
                numero_lote: item.numero_lote,
                fecha_expiracion: item.fecha_expiracion ? new Date(item.fecha_expiracion) : null,
                proveedor_id: movData.proveedor_id || null,
                created_by: userId
              }
            });
          }

          await tx.stockMaterial.upsert({
            where: {
              empresa_id_sucursal_id_almacen_id_ubicacion_id_estado_stock_id_material_id_numero_lote_unidad_medida_id: {
                empresa_id: empresaId,
                sucursal_id: d.sucursal_id,
                almacen_id: item.almacen_id,
                ubicacion_id: item.ubicacion_id,
                estado_stock_id: d.estado_stock_id,
                material_id: d.material_id!,
                numero_lote: item.numero_lote ?? null,
                unidad_medida_id: unidadMedidaControl
              }
            },
            update: { cantidad: { increment: balanceQty } },
            create: {
              empresa_id: empresaId,
              sucursal_id: d.sucursal_id,
              almacen_id: item.almacen_id,
              ubicacion_id: item.ubicacion_id,
              estado_stock_id: d.estado_stock_id,
              material_id: d.material_id!,
              numero_lote: item.numero_lote ?? null,
              cantidad: balanceQty,
              unidad_medida_id: unidadMedidaControl,
            }
          });

          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

          const existingHist = await tx.stockMaterialHistorial.findFirst({
            where: {
              empresa_id: empresaId,
              sucursal_id: d.sucursal_id,
              almacen_id: item.almacen_id,
              ubicacion_id: item.ubicacion_id,
              estado_stock_id: d.estado_stock_id,
              material_id: d.material_id!,
              numero_lote: item.numero_lote ?? null,
              unidad_medida_id: unidadMedidaControl,
              updated_at: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          });

          if (existingHist) {
            await tx.stockMaterialHistorial.update({
              where: { id: existingHist.id },
              data: {
                cantidad: { increment: balanceQty },
                updated_at: now
              }
            });
          } else {
            await tx.stockMaterialHistorial.create({
              data: {
                empresa_id: empresaId,
                sucursal_id: d.sucursal_id,
                almacen_id: item.almacen_id,
                ubicacion_id: item.ubicacion_id,
                estado_stock_id: d.estado_stock_id,
                material_id: d.material_id!,
                numero_lote: item.numero_lote ?? null,
                cantidad: balanceQty,
                unidad_medida_id: unidadMedidaControl,
                updated_at: now
              }
            });
          }
        }

        if (actualizaCosto) {
          let esquemaId = d.esquema_id_calculado;

          if (!esquemaId) {
            const defaultEsquema = await tx.esquemaValoracion.findFirst({
              where: { empresa_id: empresaId, activo: true },
              orderBy: { created_at: 'desc' }
            });
            esquemaId = defaultEsquema?.id;
          }

          if (!esquemaId) {
            throw new Error(`El material ${material.codigo || d.material_id} requiere valoración pero no tiene esquema asignado ni existe uno activo por defecto.`);
          }

          const esquema = await tx.esquemaValoracion.findUnique({ where: { id: esquemaId } });
          if (esquema) {
            const monedaId = material.moneda_costo_promedio_id || 1;

            const metodoVal = (esquema.metodo_costo || '').toUpperCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (metodoVal.includes('PROMEDIO') || metodoVal.includes('MOVIL')) {
              const currentCostRec = await tx.materialCosto.findFirst({
                where: {
                  empresa_id: empresaId,
                  material_id: d.material_id,
                  esquema_id: esquemaId,
                  moneda_id: monedaId,
                  fecha_hasta: null
                },
                orderBy: { fecha_desde: 'desc' }
              });

              const promAnt = currentCostRec ? Number(currentCostRec.costo) : Number(material.costo_promedio || 0);
              const movementQty = signoEfectivo === '+' ? cantidadBase : signoEfectivo === '-' ? -cantidadBase : 0;
              const stockDespues = stockAnt + movementQty;
              const costoIngresado = Number(d.costo_unit || 0);

              if (signoEfectivo === '+' || (signoEfectivo === '-' && stockDespues > 0)) {
                const costoNuevo = stockDespues > 0
                  ? (stockAnt * promAnt + movementQty * costoIngresado) / stockDespues
                  : costoIngresado;

                // Solo grabamos en MaterialCosto si hay un cambio real en el costo promedio
                // Usamos un pequeño margen para evitar diferencias por redondeo decimal
                if (Math.abs(costoNuevo - promAnt) > 0.0001) {
                  if (currentCostRec) {
                    await tx.materialCosto.update({
                      where: { id: currentCostRec.id },
                      data: { fecha_hasta: new Date() }
                    });
                  }

                  await tx.materialCosto.create({
                    data: {
                      empresa_id: empresaId,
                      material_id: d.material_id!,
                      moneda_id: monedaId,
                      esquema_id: esquemaId,
                      costo: costoNuevo,
                      fecha_desde: new Date(),
                      fecha_hasta: null,
                      created_by: userId
                    }
                  });
                }

                // Siempre actualizamos el costo promedio en el maestro de materiales
                await tx.material.update({
                  where: { id: d.material_id },
                  data: { costo_promedio: costoNuevo }
                });
              }
            } else if (metodoVal.includes('ESTANDAR')) {
              const hasCostRec = await tx.materialCosto.findFirst({
                where: { empresa_id: empresaId, material_id: d.material_id, esquema_id: esquemaId, fecha_hasta: null }
              });
              if (!hasCostRec) {
                await tx.materialCosto.create({
                  data: {
                    empresa_id: empresaId,
                    material_id: d.material_id!,
                    moneda_id: monedaId,
                    esquema_id: esquemaId,
                    costo: Number(material.costo_promedio || 0),
                    fecha_desde: new Date(),
                    fecha_hasta: null,
                    created_by: userId
                  }
                });
              }
            }
          }
        }
      }

      return mov;
    });

    return NextResponse.json(movimiento, { status: 201 });
  } catch (err: any) {
    console.error('[ALMACEN_POST]', err);
    return NextResponse.json({ error: err.message || 'Error al procesar movimiento' }, { status: 400 });
  }
}
