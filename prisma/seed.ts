import 'dotenv/config'
import process from 'process'
import { PrismaClient, TipoUnidadMedida } from '@prisma/client'
import bcrypt from 'bcryptjs'
import pg from 'pg'
const { Pool } = pg
import { PrismaPg } from '@prisma/adapter-pg'

process.env.PGSSLMODE = 'disable'
process.env.PGSSLMODE_DISABLE = '1'

const connectionString = (process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || '').replace('sslmode=require', 'sslmode=disable')

const pool = new Pool({
  connectionString,
  ssl: false,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Create roles
  const adminRol = await prisma.rol.upsert({
    where: { nombre: 'superadmin' },
    update: {},
    create: { nombre: 'superadmin', descripcion: 'Administrador con acceso total', sistema: true, activo: true },
  })

  // Create empresa
  const empresa = await prisma.empresa.upsert({
    where: { nif: '20123456789' },
    update: {},
    create: {
      nombre: 'Empresa Demo SA',
      nif: '20123456789',
      email: 'admin@empresademo.com',
      telefono: '+51 1 234-5678',
      direccion_fiscal: 'Av. Principal 123, Lima, Perú',
      moneda_default: 'PEN',
      zona_horaria: 'America/Lima',
    },
  })

  // Create monedas
  const monedasSeed: { descripcion: string; abreviatura: string; simbolo: string }[] = [
    { descripcion: 'Dólar estadounidense', abreviatura: 'USD', simbolo: '$' },
    { descripcion: 'Euro (Unión Europea)', abreviatura: 'EUR', simbolo: '€' },
    { descripcion: 'Yen japonés', abreviatura: 'JPY', simbolo: '¥' },
    { descripcion: 'Libra esterlina (Reino Unido)', abreviatura: 'GBP', simbolo: '£' },
    { descripcion: 'Sol peruano', abreviatura: 'PEN', simbolo: 'S/' },
    { descripcion: 'Peso argentino', abreviatura: 'ARS', simbolo: '$' },
    { descripcion: 'Peso mexicano', abreviatura: 'MXN', simbolo: '$' },
    { descripcion: 'Real brasileño', abreviatura: 'BRL', simbolo: 'R$' },
    { descripcion: 'Yuan chino', abreviatura: 'CNY', simbolo: '¥' },
    { descripcion: 'Dólar australiano', abreviatura: 'AUD', simbolo: '$' },
  ]

  for (const m of monedasSeed) {
    await prisma.moneda.upsert({
      where: { abreviatura: m.abreviatura },
      update: { descripcion: m.descripcion, simbolo: m.simbolo, activo: true },
      create: { ...m, activo: true },
    })
  }

  const pen = await prisma.moneda.findUniqueOrThrow({ where: { abreviatura: 'PEN' } })
  const usd = await prisma.moneda.findUniqueOrThrow({ where: { abreviatura: 'USD' } })

  // ───────────────────────────────────────────────────────────────────────
  // Catálogos globales (compartidos entre empresas, sin empresa_id)
  // ───────────────────────────────────────────────────────────────────────

  // Unidades de medida
  const unidadesMedida: {
    descripcion: string
    abreviatura: string
    tipo_unidad: TipoUnidadMedida
    unidad_multiplo: number
  }[] = [
      { descripcion: 'Unidad', abreviatura: 'UND', tipo_unidad: 'CANTIDAD', unidad_multiplo: 1 },
      { descripcion: 'Docena', abreviatura: 'DC', tipo_unidad: 'CANTIDAD', unidad_multiplo: 12 },
      { descripcion: 'Caja', abreviatura: 'CJ', tipo_unidad: 'CANTIDAD', unidad_multiplo: 1 },
      { descripcion: 'Kilogramo', abreviatura: 'KG', tipo_unidad: 'PESO', unidad_multiplo: 1 },
      { descripcion: 'Gramo', abreviatura: 'G', tipo_unidad: 'PESO', unidad_multiplo: 0.001 },
      { descripcion: 'Litro', abreviatura: 'LT', tipo_unidad: 'VOLUMEN', unidad_multiplo: 1 },
      { descripcion: 'Mililitro', abreviatura: 'ML', tipo_unidad: 'VOLUMEN', unidad_multiplo: 0.001 },
      { descripcion: 'Metro', abreviatura: 'M', tipo_unidad: 'LONGITUD', unidad_multiplo: 1 },
      { descripcion: 'Centímetro', abreviatura: 'CM', tipo_unidad: 'LONGITUD', unidad_multiplo: 0.01 },
      { descripcion: 'Metro Cuadrado', abreviatura: 'M2', tipo_unidad: 'AREA', unidad_multiplo: 1 },
    ]

  for (const u of unidadesMedida) {
    await prisma.unidadMedida.upsert({
      where: { abreviatura: u.abreviatura },
      update: {},
      create: u,
    })
  }

  // Industrias
  const industrias = [
    'Comercio / Retail',
    'Servicios',
    'Tecnología',
    'Manufactura',
    'Restaurantes',
    'Salud',
    'Educación',
    'Construcción',
    'Transporte',
    'Agroindustria',
  ]

  for (const descripcion of industrias) {
    await prisma.industria.upsert({
      where: { descripcion },
      update: {},
      create: { descripcion },
    })
  }

  // Países
  const paises = [
    { descripcion: 'Afghanistan', abreviatura: 'AF', prefijo_telefonico: '93' },
    { descripcion: 'Albania', abreviatura: 'AL', prefijo_telefonico: '355' },
    { descripcion: 'Algeria', abreviatura: 'DZ', prefijo_telefonico: '213' },
    { descripcion: 'Andorra', abreviatura: 'AD', prefijo_telefonico: '376' },
    { descripcion: 'Angola', abreviatura: 'AO', prefijo_telefonico: '244' },
    { descripcion: 'Argentina', abreviatura: 'AR', prefijo_telefonico: '54' },
    { descripcion: 'Armenia', abreviatura: 'AM', prefijo_telefonico: '374' },
    { descripcion: 'Aruba', abreviatura: 'AW', prefijo_telefonico: '297' },
    { descripcion: 'Australia', abreviatura: 'AU', prefijo_telefonico: '61' },
    { descripcion: 'Austria', abreviatura: 'AT', prefijo_telefonico: '43' },
    { descripcion: 'Azerbaijan', abreviatura: 'AZ', prefijo_telefonico: '994' },
    { descripcion: 'Bahrain', abreviatura: 'BH', prefijo_telefonico: '973' },
    { descripcion: 'Bangladesh', abreviatura: 'BD', prefijo_telefonico: '880' },
    { descripcion: 'Belarus', abreviatura: 'BY', prefijo_telefonico: '375' },
    { descripcion: 'Belgium', abreviatura: 'BE', prefijo_telefonico: '32' },
    { descripcion: 'Belize', abreviatura: 'BZ', prefijo_telefonico: '501' },
    { descripcion: 'Benin', abreviatura: 'BJ', prefijo_telefonico: '229' },
    { descripcion: 'Bhutan', abreviatura: 'BT', prefijo_telefonico: '975' },
    { descripcion: 'Bolivia', abreviatura: 'BO', prefijo_telefonico: '591' },
    { descripcion: 'Bosnia and Herzegovina', abreviatura: 'BA', prefijo_telefonico: '387' },
    { descripcion: 'Botswana', abreviatura: 'BW', prefijo_telefonico: '267' },
    { descripcion: 'Brazil', abreviatura: 'BR', prefijo_telefonico: '55' },
    { descripcion: 'Brunei Darussalam', abreviatura: 'BN', prefijo_telefonico: '673' },
    { descripcion: 'Bulgaria', abreviatura: 'BG', prefijo_telefonico: '359' },
    { descripcion: 'Burkina Faso', abreviatura: 'BF', prefijo_telefonico: '226' },
    { descripcion: 'Burundi', abreviatura: 'BI', prefijo_telefonico: '257' },
    { descripcion: 'Cambodia', abreviatura: 'KH', prefijo_telefonico: '855' },
    { descripcion: 'Cameroon', abreviatura: 'CM', prefijo_telefonico: '237' },
    { descripcion: 'Canada', abreviatura: 'CA', prefijo_telefonico: '1' },
    { descripcion: 'Cape Verde', abreviatura: 'CV', prefijo_telefonico: '238' },
    { descripcion: 'Chad', abreviatura: 'TD', prefijo_telefonico: '235' },
    { descripcion: 'Chile', abreviatura: 'CL', prefijo_telefonico: '56' },
    { descripcion: 'China', abreviatura: 'CN', prefijo_telefonico: '86' },
    { descripcion: 'Colombia', abreviatura: 'CO', prefijo_telefonico: '57' },
    { descripcion: 'Comoros', abreviatura: 'KM', prefijo_telefonico: '269' },
    { descripcion: 'Costa Rica', abreviatura: 'CR', prefijo_telefonico: '506' },
    { descripcion: 'Croatia', abreviatura: 'HR', prefijo_telefonico: '385' },
    { descripcion: 'Cuba', abreviatura: 'CU', prefijo_telefonico: '53' },
    { descripcion: 'Cyprus', abreviatura: 'CY', prefijo_telefonico: '357' },
    { descripcion: 'Czech Republic', abreviatura: 'CZ', prefijo_telefonico: '420' },
    { descripcion: 'Denmark', abreviatura: 'DK', prefijo_telefonico: '45' },
    { descripcion: 'Djibouti', abreviatura: 'DJ', prefijo_telefonico: '253' },
    { descripcion: 'Ecuador', abreviatura: 'EC', prefijo_telefonico: '593' },
    { descripcion: 'Egypt', abreviatura: 'EG', prefijo_telefonico: '20' },
    { descripcion: 'El Salvador', abreviatura: 'SV', prefijo_telefonico: '503' },
    { descripcion: 'Equatorial Guinea', abreviatura: 'GQ', prefijo_telefonico: '240' },
    { descripcion: 'Eritrea', abreviatura: 'ER', prefijo_telefonico: '291' },
    { descripcion: 'Estonia', abreviatura: 'EE', prefijo_telefonico: '372' },
    { descripcion: 'Ethiopia', abreviatura: 'ET', prefijo_telefonico: '251' },
    { descripcion: 'Faroe Islands', abreviatura: 'FO', prefijo_telefonico: '298' },
    { descripcion: 'Fiji', abreviatura: 'FJ', prefijo_telefonico: '679' },
    { descripcion: 'Finland', abreviatura: 'FI', prefijo_telefonico: '358' },
    { descripcion: 'France', abreviatura: 'FR', prefijo_telefonico: '33' },
    { descripcion: 'French Guiana', abreviatura: 'GF', prefijo_telefonico: '594' },
    { descripcion: 'French Polynesia', abreviatura: 'PF', prefijo_telefonico: '689' },
    { descripcion: 'Gabon', abreviatura: 'GA', prefijo_telefonico: '241' },
    { descripcion: 'Gambia', abreviatura: 'GM', prefijo_telefonico: '220' },
    { descripcion: 'Georgia', abreviatura: 'GE', prefijo_telefonico: '995' },
    { descripcion: 'Germany', abreviatura: 'DE', prefijo_telefonico: '49' },
    { descripcion: 'Ghana', abreviatura: 'GH', prefijo_telefonico: '233' },
    { descripcion: 'Gibraltar', abreviatura: 'GI', prefijo_telefonico: '350' },
    { descripcion: 'Greece', abreviatura: 'GR', prefijo_telefonico: '30' },
    { descripcion: 'Greenland', abreviatura: 'GL', prefijo_telefonico: '299' },
    { descripcion: 'Guadeloupe', abreviatura: 'GP', prefijo_telefonico: '590' },
    { descripcion: 'Guatemala', abreviatura: 'GT', prefijo_telefonico: '502' },
    { descripcion: 'Guinea', abreviatura: 'GN', prefijo_telefonico: '224' },
    { descripcion: 'Guinea-Bissau', abreviatura: 'GW', prefijo_telefonico: '245' },
    { descripcion: 'Guyana', abreviatura: 'GY', prefijo_telefonico: '592' },
    { descripcion: 'Haiti', abreviatura: 'HT', prefijo_telefonico: '509' },
    { descripcion: 'Honduras', abreviatura: 'HN', prefijo_telefonico: '504' },
    { descripcion: 'Hungary', abreviatura: 'HU', prefijo_telefonico: '36' },
    { descripcion: 'Iceland', abreviatura: 'IS', prefijo_telefonico: '354' },
    { descripcion: 'India', abreviatura: 'IN', prefijo_telefonico: '91' },
    { descripcion: 'Indonesia', abreviatura: 'ID', prefijo_telefonico: '62' },
    { descripcion: 'Iraq', abreviatura: 'IQ', prefijo_telefonico: '964' },
    { descripcion: 'Ireland', abreviatura: 'IE', prefijo_telefonico: '353' },
    { descripcion: 'Israel', abreviatura: 'IL', prefijo_telefonico: '972' },
    { descripcion: 'Italy', abreviatura: 'IT', prefijo_telefonico: '39' },
    { descripcion: 'Japan', abreviatura: 'JP', prefijo_telefonico: '81' },
    { descripcion: 'Jordan', abreviatura: 'JO', prefijo_telefonico: '962' },
    { descripcion: 'Kenya', abreviatura: 'KE', prefijo_telefonico: '254' },
    { descripcion: 'Kiribati', abreviatura: 'KI', prefijo_telefonico: '686' },
    { descripcion: 'Kuwait', abreviatura: 'KW', prefijo_telefonico: '965' },
    { descripcion: 'Kyrgyzstan', abreviatura: 'KG', prefijo_telefonico: '996' },
    { descripcion: 'Latvia', abreviatura: 'LV', prefijo_telefonico: '371' },
    { descripcion: 'Lebanon', abreviatura: 'LB', prefijo_telefonico: '961' },
    { descripcion: 'Lesotho', abreviatura: 'LS', prefijo_telefonico: '266' },
    { descripcion: 'Liberia', abreviatura: 'LR', prefijo_telefonico: '231' },
    { descripcion: 'Libya', abreviatura: 'LY', prefijo_telefonico: '218' },
    { descripcion: 'Liechtenstein', abreviatura: 'LI', prefijo_telefonico: '423' },
    { descripcion: 'Lithuania', abreviatura: 'LT', prefijo_telefonico: '370' },
    { descripcion: 'Luxembourg', abreviatura: 'LU', prefijo_telefonico: '352' },
    { descripcion: 'Madagascar', abreviatura: 'MG', prefijo_telefonico: '261' },
    { descripcion: 'Malawi', abreviatura: 'MW', prefijo_telefonico: '265' },
    { descripcion: 'Malaysia', abreviatura: 'MY', prefijo_telefonico: '60' },
    { descripcion: 'Maldives', abreviatura: 'MV', prefijo_telefonico: '960' },
    { descripcion: 'Mali', abreviatura: 'ML', prefijo_telefonico: '223' },
    { descripcion: 'Malta', abreviatura: 'MT', prefijo_telefonico: '356' },
    { descripcion: 'Marshall Islands', abreviatura: 'MH', prefijo_telefonico: '692' },
    { descripcion: 'Martinique', abreviatura: 'MQ', prefijo_telefonico: '596' },
    { descripcion: 'Mauritania', abreviatura: 'MR', prefijo_telefonico: '222' },
    { descripcion: 'Mauritius', abreviatura: 'MU', prefijo_telefonico: '230' },
    { descripcion: 'Mexico', abreviatura: 'MX', prefijo_telefonico: '52' },
    { descripcion: 'Micronesia, Federated States of', abreviatura: 'FM', prefijo_telefonico: '691' },
    { descripcion: 'Moldova', abreviatura: 'MD', prefijo_telefonico: '373' },
    { descripcion: 'Monaco', abreviatura: 'MC', prefijo_telefonico: '377' },
    { descripcion: 'Mongolia', abreviatura: 'MN', prefijo_telefonico: '976' },
    { descripcion: 'Montenegro', abreviatura: 'ME', prefijo_telefonico: '382' },
    { descripcion: 'Morocco', abreviatura: 'MA', prefijo_telefonico: '212' },
    { descripcion: 'Mozambique', abreviatura: 'MZ', prefijo_telefonico: '258' },
    { descripcion: 'Myanmar', abreviatura: 'MM', prefijo_telefonico: '95' },
    { descripcion: 'Namibia', abreviatura: 'NA', prefijo_telefonico: '264' },
    { descripcion: 'Nauru', abreviatura: 'NR', prefijo_telefonico: '674' },
    { descripcion: 'Netherlands', abreviatura: 'NL', prefijo_telefonico: '31' },
    { descripcion: 'New Caledonia', abreviatura: 'NC', prefijo_telefonico: '687' },
    { descripcion: 'New Zealand', abreviatura: 'NZ', prefijo_telefonico: '64' },
    { descripcion: 'Nicaragua', abreviatura: 'NI', prefijo_telefonico: '505' },
    { descripcion: 'Niger', abreviatura: 'NE', prefijo_telefonico: '227' },
    { descripcion: 'Nigeria', abreviatura: 'NG', prefijo_telefonico: '234' },
    { descripcion: 'Niue', abreviatura: 'NU', prefijo_telefonico: '683' },
    { descripcion: 'Norway', abreviatura: 'NO', prefijo_telefonico: '47' },
    { descripcion: 'Oman', abreviatura: 'OM', prefijo_telefonico: '968' },
    { descripcion: 'Pakistan', abreviatura: 'PK', prefijo_telefonico: '92' },
    { descripcion: 'Palau', abreviatura: 'PW', prefijo_telefonico: '680' },
    { descripcion: 'Panama', abreviatura: 'PA', prefijo_telefonico: '507' },
    { descripcion: 'Papua New Guinea', abreviatura: 'PG', prefijo_telefonico: '675' },
    { descripcion: 'Paraguay', abreviatura: 'PY', prefijo_telefonico: '595' },
    { descripcion: 'Peru', abreviatura: 'PE', prefijo_telefonico: '51' },
    { descripcion: 'Philippines', abreviatura: 'PH', prefijo_telefonico: '63' },
    { descripcion: 'Poland', abreviatura: 'PL', prefijo_telefonico: '48' },
    { descripcion: 'Portugal', abreviatura: 'PT', prefijo_telefonico: '351' },
    { descripcion: 'Qatar', abreviatura: 'QA', prefijo_telefonico: '974' },
    { descripcion: 'Réunion', abreviatura: 'RE', prefijo_telefonico: '262' },
    { descripcion: 'Romania', abreviatura: 'RO', prefijo_telefonico: '40' },
    { descripcion: 'Rwanda', abreviatura: 'RW', prefijo_telefonico: '250' },
    { descripcion: 'Saint Helena', abreviatura: 'SH', prefijo_telefonico: '290' },
    { descripcion: 'Saint Pierre and Miquelon', abreviatura: 'PM', prefijo_telefonico: '508' },
    { descripcion: 'Samoa', abreviatura: 'WS', prefijo_telefonico: '685' },
    { descripcion: 'San Marino', abreviatura: 'SM', prefijo_telefonico: '378' },
    { descripcion: 'Saudi Arabia', abreviatura: 'SA', prefijo_telefonico: '966' },
    { descripcion: 'Senegal', abreviatura: 'SN', prefijo_telefonico: '221' },
    { descripcion: 'Serbia', abreviatura: 'RS', prefijo_telefonico: '381' },
    { descripcion: 'Seychelles', abreviatura: 'SC', prefijo_telefonico: '248' },
    { descripcion: 'Sierra Leone', abreviatura: 'SL', prefijo_telefonico: '232' },
    { descripcion: 'Singapore', abreviatura: 'SG', prefijo_telefonico: '65' },
    { descripcion: 'Slovakia', abreviatura: 'SK', prefijo_telefonico: '421' },
    { descripcion: 'Slovenia', abreviatura: 'SI', prefijo_telefonico: '386' },
    { descripcion: 'Solomon Islands', abreviatura: 'SB', prefijo_telefonico: '677' },
    { descripcion: 'Somalia', abreviatura: 'SO', prefijo_telefonico: '252' },
    { descripcion: 'South Africa', abreviatura: 'ZA', prefijo_telefonico: '27' },
    { descripcion: 'South Sudan', abreviatura: 'SS', prefijo_telefonico: '211' },
    { descripcion: 'Spain', abreviatura: 'ES', prefijo_telefonico: '34' },
    { descripcion: 'Sri Lanka', abreviatura: 'LK', prefijo_telefonico: '94' },
    { descripcion: 'Sudan', abreviatura: 'SD', prefijo_telefonico: '249' },
    { descripcion: 'Suriname', abreviatura: 'SR', prefijo_telefonico: '597' },
    { descripcion: 'Sweden', abreviatura: 'SE', prefijo_telefonico: '46' },
    { descripcion: 'Tajikistan', abreviatura: 'TJ', prefijo_telefonico: '992' },
    { descripcion: 'Thailand', abreviatura: 'TH', prefijo_telefonico: '66' },
    { descripcion: 'Togo', abreviatura: 'TG', prefijo_telefonico: '228' },
    { descripcion: 'Tokelau', abreviatura: 'TK', prefijo_telefonico: '690' },
    { descripcion: 'Tonga', abreviatura: 'TO', prefijo_telefonico: '676' },
    { descripcion: 'Tunisia', abreviatura: 'TN', prefijo_telefonico: '216' },
    { descripcion: 'Turkey', abreviatura: 'TR', prefijo_telefonico: '90' },
    { descripcion: 'Turkmenistan', abreviatura: 'TM', prefijo_telefonico: '993' },
    { descripcion: 'Tuvalu', abreviatura: 'TV', prefijo_telefonico: '688' },
    { descripcion: 'Uganda', abreviatura: 'UG', prefijo_telefonico: '256' },
    { descripcion: 'Ukraine', abreviatura: 'UA', prefijo_telefonico: '380' },
    { descripcion: 'United Arab Emirates', abreviatura: 'AE', prefijo_telefonico: '971' },
    { descripcion: 'United Kingdom', abreviatura: 'GB', prefijo_telefonico: '44' },
    { descripcion: 'Uruguay', abreviatura: 'UY', prefijo_telefonico: '598' },
    { descripcion: 'Uzbekistan', abreviatura: 'UZ', prefijo_telefonico: '998' },
    { descripcion: 'Vanuatu', abreviatura: 'VU', prefijo_telefonico: '678' },
    { descripcion: 'Yemen', abreviatura: 'YE', prefijo_telefonico: '967' },
    { descripcion: 'Zambia', abreviatura: 'ZM', prefijo_telefonico: '260' },
    { descripcion: 'Zimbabwe', abreviatura: 'ZW', prefijo_telefonico: '263' },
  ]

  for (const p of paises) {
    await prisma.pais.upsert({
      where: { descripcion: p.descripcion },
      update: {},
      create: p,
    })
  }

  // Documentos de identificación
  const documentosIdentificacion = [
    { descripcion: 'DNI', abreviatura: 'DNI', tipo: 'natural' },
    { descripcion: 'RUC', abreviatura: 'RUC', tipo: 'juridica' },
    { descripcion: 'Carnet de Extranjería', abreviatura: 'CE', tipo: 'natural' },
    { descripcion: 'Pasaporte', abreviatura: 'PAS', tipo: 'natural' },
  ]

  for (const d of documentosIdentificacion) {
    await prisma.documentoIdentificacion.upsert({
      where: { abreviatura: d.abreviatura },
      update: {},
      create: d,
    })
  }

  // Denominaciones por moneda
  const denominaciones: {
    moneda_id: number
    valor: number
    tipo: string
    secuencia: number
  }[] = [
      // PEN - Billetes
      { moneda_id: pen.id, valor: 200, tipo: 'Billete', secuencia: 1 },
      { moneda_id: pen.id, valor: 100, tipo: 'Billete', secuencia: 2 },
      { moneda_id: pen.id, valor: 50, tipo: 'Billete', secuencia: 3 },
      { moneda_id: pen.id, valor: 20, tipo: 'Billete', secuencia: 4 },
      { moneda_id: pen.id, valor: 10, tipo: 'Billete', secuencia: 5 },
      // PEN - Monedas
      { moneda_id: pen.id, valor: 5, tipo: 'Moneda', secuencia: 6 },
      { moneda_id: pen.id, valor: 2, tipo: 'Moneda', secuencia: 7 },
      { moneda_id: pen.id, valor: 1, tipo: 'Moneda', secuencia: 8 },
      { moneda_id: pen.id, valor: 0.5, tipo: 'Moneda', secuencia: 9 },
      { moneda_id: pen.id, valor: 0.2, tipo: 'Moneda', secuencia: 10 },
      { moneda_id: pen.id, valor: 0.1, tipo: 'Moneda', secuencia: 11 },
      // USD - Billetes
      { moneda_id: usd.id, valor: 100, tipo: 'Billete', secuencia: 1 },
      { moneda_id: usd.id, valor: 50, tipo: 'Billete', secuencia: 2 },
      { moneda_id: usd.id, valor: 20, tipo: 'Billete', secuencia: 3 },
      { moneda_id: usd.id, valor: 10, tipo: 'Billete', secuencia: 4 },
      { moneda_id: usd.id, valor: 5, tipo: 'Billete', secuencia: 5 },
      { moneda_id: usd.id, valor: 2, tipo: 'Billete', secuencia: 6 },
      { moneda_id: usd.id, valor: 1, tipo: 'Billete', secuencia: 7 },
      // USD - Monedas
      { moneda_id: usd.id, valor: 1, tipo: 'Moneda', secuencia: 8 },
      { moneda_id: usd.id, valor: 0.5, tipo: 'Moneda', secuencia: 9 },
      { moneda_id: usd.id, valor: 0.25, tipo: 'Moneda', secuencia: 10 },
      { moneda_id: usd.id, valor: 0.1, tipo: 'Moneda', secuencia: 11 },
      { moneda_id: usd.id, valor: 0.05, tipo: 'Moneda', secuencia: 12 },
      { moneda_id: usd.id, valor: 0.01, tipo: 'Moneda', secuencia: 13 },
    ]

  for (const d of denominaciones) {
    await prisma.monedaDenominacion.upsert({
      where: { moneda_id_valor: { moneda_id: d.moneda_id, valor: d.valor } },
      update: {},
      create: d,
    })
  }

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.usuario.upsert({
    where: { empresa_id_email: { empresa_id: empresa.id, email: 'admin@empresademo.com' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      rol_id: adminRol.id,
      nombre: 'Administrador',
      email: 'admin@empresademo.com',
      password_hash: passwordHash,
      activo: true,
    },
  })

  // Create usuario rol
  await prisma.usuarioRol.upsert({
    where: { usuario_id_rol_id: { usuario_id: adminUser.id, rol_id: adminRol.id } },
    update: {},
    create: { usuario_id: adminUser.id, rol_id: adminRol.id, assigned_by: adminUser.id }
  })

  // Create impuesto
  const igv = await prisma.impuesto.upsert({
    where: { empresa_id_codigo: { empresa_id: empresa.id, codigo: 'IGV' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      codigo: 'IGV',
      descripcion: 'Impuesto General a las Ventas',
      porcentaje: 18,
      tipo: 'IGV',
      activo: true,
    },
  })

  // Create sample materials
  const materialesCount = await prisma.material.count({ where: { empresa_id: empresa.id } })
  if (materialesCount === 0) {
    const materiales = [
      { codigo: 'MAT-001', descripcion: 'Laptop Dell Inspiron 15', precio_costo: 1200, precio_venta: 1599, stock_actual: 25, stock_minimo: 5 },
      { codigo: 'MAT-002', descripcion: 'Mouse Inalámbrico Logitech', precio_costo: 25, precio_venta: 45, stock_actual: 120, stock_minimo: 20 },
      { codigo: 'MAT-003', descripcion: 'Teclado Mecánico RGB', precio_costo: 80, precio_venta: 129, stock_actual: 45, stock_minimo: 10 },
      { codigo: 'MAT-004', descripcion: 'Monitor 24" Full HD', precio_costo: 200, precio_venta: 299, stock_actual: 30, stock_minimo: 5 },
      { codigo: 'MAT-005', descripcion: 'Auriculares Bluetooth Sony', precio_costo: 60, precio_venta: 99, stock_actual: 80, stock_minimo: 15 },
    ]

    for (const m of materiales) {
      await prisma.material.create({ data: { ...m, empresa_id: empresa.id, impuesto_id: igv.id } })
    }
  }

  // Create sample client
  await prisma.cliente.upsert({
    where: { empresa_id_codigo: { empresa_id: empresa.id, codigo: 'CLI-001' } },
    update: {},
    create: {
      empresa_id: empresa.id,
      codigo: 'CLI-001',
      tipo: 'empresa',
      nombre: 'Corporación Tecnológica SAC',
      nif: 'RUC-20987654321',
      email: 'compras@corptec.com',
      telefono: '+51 1 987-6543',
      contacto: 'Ana García',
    },
  })

  // Create Modulos
  const modulos = await Promise.all([
    prisma.modulo.upsert({
      where: { codigo: 'COMERCIAL' },
      update: {},
      create: { codigo: 'COMERCIAL', descripcion: 'Módulo Comercial', orden: 1, activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'TESORERIA' },
      update: {},
      create: { codigo: 'TESORERIA', descripcion: 'Módulo Tesorería', orden: 2, activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'LOGISTICA' },
      update: {},
      create: { codigo: 'LOGISTICA', descripcion: 'Módulo Logística', orden: 3, activo: true },
    }),
    prisma.modulo.upsert({
      where: { codigo: 'ADMINISTRACION' },
      update: {},
      create: { codigo: 'ADMINISTRACION', descripcion: 'Administración', orden: 4, activo: true },
    })
  ])

  const [comercialModulo, tesoreriaModulo, logisticaModulo, adminModulo] = modulos

  const parentPrincipal = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'DASHBOARD' } },
    update: {},
    create: { modulo_id: adminModulo.id, codigo: 'DASHBOARD', descripcion: 'Dashboard', ruta: '/dashboard', orden: 1, activo: true, created_by: 1 },
  })

  // Módulo Comercial
  const parentComercial = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'COMERCIAL' } },
    update: {},
    create: { modulo_id: comercialModulo.id, codigo: 'COMERCIAL', descripcion: 'Módulo Comercial', orden: 2, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'VENTAS' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'VENTAS', descripcion: 'Ventas', ruta: '/ventas', orden: 3, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'PUNTO_VENTA' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'PUNTO_VENTA', descripcion: 'Punto de Venta', ruta: '/ventas/pos', orden: 4, activo: true, created_by: 1 },
  })

  const parentMaestros = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'MAESTROS_COM' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'MAESTROS_COM', descripcion: 'Maestros', orden: 5, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CLIENTES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CLIENTES', descripcion: 'Clientes', ruta: '/maestros/clientes', orden: 6, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CONDICION_COMERCIAL' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CONDICION_COMERCIAL', descripcion: 'Condicionaes Comerciales', ruta: '/maestros/comercial/condiciones', orden: 7, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CUPONES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CUPONES', descripcion: 'Cupones', ruta: '/precios/cupones', orden: 8, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'PROMOCIONES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'PROMOCIONES', descripcion: 'Promociones', ruta: '/precios/promociones', orden: 9, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'ESQUEMA_CALCULO' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'ESQUEMA_CALCULO', descripcion: 'Esquema de Cálculo', ruta: '/maestros/comercial/esquemas-calculo', orden: 10, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'CLASE_PEDIDO' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentMaestros.id, codigo: 'CLASE_PEDIDO', descripcion: 'Clase de Pedido', ruta: '/maestros/comercial/clases-pedido', orden: 11, activo: true, created_by: 1 },
  })

  const parentReportes = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'REPORTES' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentComercial.id, codigo: 'REPORTES', descripcion: 'Reportes', orden: 12, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: comercialModulo.id, codigo: 'REPORTE_VENTA' } },
    update: {},
    create: { modulo_id: comercialModulo.id, parent_id: parentReportes.id, codigo: 'REPORTE_VENTA', descripcion: 'Reporte de Venta', orden: 13, activo: true, created_by: 1 },
  })

  // Módulo de Tesoreria
  const parentTesoreria = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'TESORERIA' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, codigo: 'TESORERIA', descripcion: 'Módulo Tesoreria', orden: 14, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'GESTION_CAJA' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentTesoreria.id, codigo: 'GESTION_CAJA', descripcion: 'Gestión de Caja', ruta: '/gestion-caja', orden: 15, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'HISTORIAL_TRN' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentTesoreria.id, codigo: 'HISTORIAL_TRN', descripcion: 'Historial de Transacciones', ruta: '/consultas/transacciones-caja', orden: 16, activo: true, created_by: 1 },
  })

  const parentMaestrosTesoreria = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'MAESTROS_TES' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentTesoreria.id, codigo: 'MAESTROS_TES', descripcion: 'Maestros', orden: 17, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'MONEDAS' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'MONEDAS', descripcion: 'Monedas', ruta: '/tesoreria/monedas', orden: 18, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'BANCOS' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'BANCOS', descripcion: 'Bancos', ruta: '/tesoreria/bancos', orden: 19, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'TIPO_CAMBIO' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'TIPO_CAMBIO', descripcion: 'Tipos de Cambio', ruta: '/tesoreria/tipo-cambio', orden: 20, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'MEDIO_PAGO' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'MEDIO_PAGO', descripcion: 'Medios de Pago', ruta: '/tesoreria/medios-pago', orden: 21, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'CAJAS' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'CAJAS', descripcion: 'Cajas', ruta: '/tesoreria/cajas', orden: 22, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: tesoreriaModulo.id, codigo: 'CONCEPTO_CAJA' } },
    update: {},
    create: { modulo_id: tesoreriaModulo.id, parent_id: parentMaestrosTesoreria.id, codigo: 'CONCEPTO_CAJA', descripcion: 'Concepto Caja', ruta: '/tesoreria/conceptos-caja', orden: 23, activo: true, created_by: 1 },
  })

  // Módulo Logística
  const parentLogistica = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'LOGISTICA' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, codigo: 'LOGISTICA', descripcion: 'Módulo Logística', orden: 24, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MOVIMIENTO' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'MOVIMIENTO', descripcion: 'Movimientos', ruta: '/almacen/movimientos', orden: 25, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'KARDEX' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'KARDEX', descripcion: 'Kardex', ruta: '/almacen/kardex', orden: 26, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'STOCK_MATERIAL' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'STOCK_MATERIAL', descripcion: 'Stock x Material', ruta: '/consultas/stock', orden: 27, activo: true, created_by: 1 },
  })

  const parentMaestrosLogistica = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MAESTROS_LOG' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentLogistica.id, codigo: 'MAESTROS_LOG', descripcion: 'Maestros', orden: 28, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MARCAS' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'MARCAS', descripcion: 'Marcas', ruta: '/maestros/logistica/marcas', orden: 29, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'CATEGORIAS' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'CATEGORIAS', descripcion: 'Categorías', ruta: '/maestros/logistica/categorias', orden: 30, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'TIPO_MATERIAL' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'TIPO_MATERIAL', descripcion: 'Tipos de Material', ruta: '/maestros/logistica/tipos-material', orden: 31, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'UNIDAD_MEDIDA' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'UNIDAD_MEDIDA', descripcion: 'Unidades de Medida', ruta: '/maestros/logistica/unidades', orden: 32, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'ESTADO_STOCK' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'ESTADO_STOCK', descripcion: 'Estado de Stock', ruta: '/maestros/estados-stock', orden: 33, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'TIPO_OPERACION' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'TIPO_OPERACION', descripcion: 'Tipo de Operación', ruta: '/maestros/logistica/tipos-operacion', orden: 34, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'UBICACIONES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'UBICACIONES', descripcion: 'Ubicaciones', ruta: '/maestros/ubicaciones', orden: 35, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'ALMACENES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'ALMACENES', descripcion: 'Almacenes', ruta: '/maestros/logistica/almacenes', orden: 36, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'ESQUEMA_VALORACION' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'ESQUEMA_VALORACION', descripcion: 'Esquema de Valoración', ruta: '/maestros/logistica/esquemas-valoracion', orden: 37, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'PROVEEDORES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'PROVEEDORES', descripcion: 'Proveedores', ruta: '/maestros/proveedores', orden: 38, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: logisticaModulo.id, codigo: 'MATERIALES' } },
    update: {},
    create: { modulo_id: logisticaModulo.id, parent_id: parentMaestrosLogistica.id, codigo: 'MATERIALES', descripcion: 'Materiales', ruta: '/maestros/materiales', orden: 39, activo: true, created_by: 1 },
  })

  // Módulo Administración
  const parentAdministracion = await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'ADMINISTRACION' } },
    update: {},
    create: { modulo_id: adminModulo.id, codigo: 'ADMINISTRACION', descripcion: 'Administración', orden: 40, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'EMPRESA' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'EMPRESA', descripcion: 'Empresa', ruta: '/empresa', orden: 41, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'ROL_USUARIO' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'ROL_USUARIO', descripcion: 'Rol de Usuario', ruta: '/roles', orden: 42, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'USUARIOS' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'USUARIOS', descripcion: 'Usuarios', ruta: '/usuarios', orden: 43, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'PARAMETROS_SISTEMA' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'PARAMETROS_SISTEMA', descripcion: 'Parámetros del Sistema', ruta: '/maestros/configuracion/parametros-sistema', orden: 44, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'INDUSTRIAS' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'INDUSTRIAS', descripcion: 'Industrias', ruta: '/logistica/industrias', orden: 45, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'PAISES' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'PAISES', descripcion: 'Países', ruta: '/logistica/paises', orden: 46, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'DOCUMENTO_ID' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'DOCUMENTO_ID', descripcion: 'Documentos de Identificación', ruta: '/logistica/documentos-identificacion', orden: 47, activo: true, created_by: 1 },
  })

  await prisma.opcionMenu.upsert({
    where: { modulo_id_codigo: { modulo_id: adminModulo.id, codigo: 'CORRELATIVOS' } },
    update: {},
    create: { modulo_id: adminModulo.id, parent_id: parentAdministracion.id, codigo: 'CORRELATIVOS', descripcion: 'Correlativos', ruta: '/maestros/comercial/correlativos', orden: 48, activo: true, created_by: 1 },
  })

  // ───────────────────────────────────────────────────────────────────────
  // Configuración visual por "Áreas de Trabajo" (UX)
  // Desacopla la representación del sidebar de la jerarquía técnica.
  //   area    → área de trabajo: ventas | caja | inventario | tesoreria | administracion
  //             (null = nivel raíz, ej: Inicio/Dashboard)
  //   grupo   → bloque visual dentro del área: operaciones (Frecuentes) | configuracion
  //   visible → false oculta nodos técnicos/agrupadores del sidebar (se conservan
  //             en la matriz de permisos del RolEditor)
  // ───────────────────────────────────────────────────────────────────────
  type MenuVisualConfig = {
    modulo: string
    codigo: string
    area: string | null
    grupo: string | null
    visible: boolean
    etiqueta?: string
  }

  const MENU_VISUAL_CONFIG: MenuVisualConfig[] = [
    // ── Nivel raíz ────────────────────────────────────────────────────────
    { modulo: 'ADMINISTRACION', codigo: 'DASHBOARD', area: null, grupo: null, visible: true, etiqueta: 'Inicio' },
    // ── Nodos técnicos (ocultos del sidebar) ──────────────────────────────
    { modulo: 'COMERCIAL', codigo: 'COMERCIAL', area: null, grupo: null, visible: false },
    { modulo: 'COMERCIAL', codigo: 'MAESTROS_COM', area: null, grupo: null, visible: false },
    { modulo: 'COMERCIAL', codigo: 'REPORTES', area: null, grupo: null, visible: false },
    { modulo: 'COMERCIAL', codigo: 'REPORTE_VENTA', area: null, grupo: null, visible: false },
    { modulo: 'TESORERIA', codigo: 'TESORERIA', area: null, grupo: null, visible: false },
    { modulo: 'TESORERIA', codigo: 'MAESTROS_TES', area: null, grupo: null, visible: false },
    { modulo: 'LOGISTICA', codigo: 'LOGISTICA', area: null, grupo: null, visible: false },
    { modulo: 'LOGISTICA', codigo: 'MAESTROS_LOG', area: null, grupo: null, visible: false },
    { modulo: 'ADMINISTRACION', codigo: 'ADMINISTRACION', area: null, grupo: null, visible: false },
    // Legado: fila duplicada de ROL_USUARIO (ruta /roles) sin área → se oculta
    { modulo: 'ADMINISTRACION', codigo: 'ROLES', area: null, grupo: null, visible: false },
    // ── Área: VENTAS ──────────────────────────────────────────────────────
    { modulo: 'COMERCIAL', codigo: 'VENTAS', area: 'ventas', grupo: 'operaciones', visible: true },
    { modulo: 'COMERCIAL', codigo: 'PUNTO_VENTA', area: 'ventas', grupo: 'operaciones', visible: true },
    { modulo: 'COMERCIAL', codigo: 'CLIENTES', area: 'ventas', grupo: 'operaciones', visible: true },
    { modulo: 'COMERCIAL', codigo: 'CONDICION_COMERCIAL', area: 'ventas', grupo: 'configuracion', visible: true },
    { modulo: 'COMERCIAL', codigo: 'PROMOCIONES', area: 'ventas', grupo: 'configuracion', visible: true },
    { modulo: 'COMERCIAL', codigo: 'CUPONES', area: 'ventas', grupo: 'configuracion', visible: true },
    { modulo: 'COMERCIAL', codigo: 'ESQUEMA_CALCULO', area: 'ventas', grupo: 'configuracion', visible: true },
    { modulo: 'COMERCIAL', codigo: 'CLASE_PEDIDO', area: 'ventas', grupo: 'configuracion', visible: true },
    // ── Área: CAJA (incluye Tesorería fusionada en Configuración) ─────────
    { modulo: 'TESORERIA', codigo: 'GESTION_CAJA', area: 'caja', grupo: 'operaciones', visible: true, etiqueta: 'Gestión de Caja' },
    { modulo: 'TESORERIA', codigo: 'HISTORIAL_TRN', area: 'caja', grupo: 'operaciones', visible: true, etiqueta: 'Movimientos de Caja' },
    { modulo: 'TESORERIA', codigo: 'CAJAS', area: 'caja', grupo: 'operaciones', visible: true },
    { modulo: 'TESORERIA', codigo: 'BANCOS', area: 'caja', grupo: 'configuracion', visible: true },
    { modulo: 'TESORERIA', codigo: 'MONEDAS', area: 'caja', grupo: 'configuracion', visible: true },
    { modulo: 'TESORERIA', codigo: 'TIPO_CAMBIO', area: 'caja', grupo: 'configuracion', visible: true },
    { modulo: 'TESORERIA', codigo: 'MEDIO_PAGO', area: 'caja', grupo: 'configuracion', visible: true },
    { modulo: 'TESORERIA', codigo: 'CONCEPTO_CAJA', area: 'caja', grupo: 'configuracion', visible: true },
    // ── Área: INVENTARIO ──────────────────────────────────────────────────
    { modulo: 'LOGISTICA', codigo: 'STOCK_MATERIAL', area: 'inventario', grupo: 'operaciones', visible: true },
    { modulo: 'LOGISTICA', codigo: 'MOVIMIENTO', area: 'inventario', grupo: 'operaciones', visible: true },
    { modulo: 'LOGISTICA', codigo: 'KARDEX', area: 'inventario', grupo: 'operaciones', visible: true },
    { modulo: 'LOGISTICA', codigo: 'MATERIALES', area: 'inventario', grupo: 'operaciones', visible: true },
    { modulo: 'LOGISTICA', codigo: 'CATEGORIAS', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'MARCAS', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'TIPO_MATERIAL', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'UNIDAD_MEDIDA', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'ALMACENES', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'UBICACIONES', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'ESTADO_STOCK', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'TIPO_OPERACION', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'ESQUEMA_VALORACION', area: 'inventario', grupo: 'configuracion', visible: true },
    { modulo: 'LOGISTICA', codigo: 'PROVEEDORES', area: 'inventario', grupo: 'configuracion', visible: true },
    // ── Área: ADMINISTRACIÓN ──────────────────────────────────────────────
    { modulo: 'ADMINISTRACION', codigo: 'EMPRESA', area: 'administracion', grupo: 'operaciones', visible: true },
    { modulo: 'ADMINISTRACION', codigo: 'USUARIOS', area: 'administracion', grupo: 'operaciones', visible: true },
    { modulo: 'ADMINISTRACION', codigo: 'ROL_USUARIO', area: 'administracion', grupo: 'operaciones', visible: true, etiqueta: 'Roles y Permisos' },
    { modulo: 'ADMINISTRACION', codigo: 'PARAMETROS_SISTEMA', area: 'administracion', grupo: 'configuracion', visible: true },
    { modulo: 'ADMINISTRACION', codigo: 'PAISES', area: 'administracion', grupo: 'configuracion', visible: true },
    { modulo: 'ADMINISTRACION', codigo: 'INDUSTRIAS', area: 'administracion', grupo: 'configuracion', visible: true },
    { modulo: 'ADMINISTRACION', codigo: 'DOCUMENTO_ID', area: 'administracion', grupo: 'configuracion', visible: true },
    { modulo: 'ADMINISTRACION', codigo: 'CORRELATIVOS', area: 'administracion', grupo: 'configuracion', visible: true },
  ]

  const moduloPorCodigo = new Map(modulos.map((m) => [m.codigo, m.id]))

  for (const cfg of MENU_VISUAL_CONFIG) {
    const moduloId = moduloPorCodigo.get(cfg.modulo)
    if (!moduloId) continue
    await prisma.opcionMenu.updateMany({
      where: { modulo_id: moduloId, codigo: cfg.codigo },
      data: {
        area_trabajo: cfg.area,
        grupo: cfg.grupo,
        visible_menu: cfg.visible,
        ...(cfg.etiqueta ? { descripcion: cfg.etiqueta } : {}),
      },
    })
  }

  // Create Permisos for superadmin (full access to all menu options)
  const allOpcionesMenu = await prisma.opcionMenu.findMany()
  await Promise.all(
    allOpcionesMenu.map(opcion =>
      prisma.permisos.upsert({
        where: { rol_id_opcion_menu_id: { rol_id: adminRol.id, opcion_menu_id: opcion.id } },
        update: {},
        create: {
          rol_id: adminRol.id,
          opcion_menu_id: opcion.id,
          visualizar: true,
          crear: true,
          editar: true,
          borrar: true,
          exportar: true,
          importar: true,
          abrir_cerrar_caja: true,
        },
      })
    )
  )

  // Create EmpresaModulo (associate all modulos to the empresa)
  for (const modulo of modulos) {
    await prisma.empresaModulo.upsert({
      where: { empresa_id_modulo_id: { empresa_id: empresa.id, modulo_id: modulo.id } },
      update: {},
      create: { empresa_id: empresa.id, modulo_id: modulo.id, activo: true, created_by: null },
    })
  }

  // Clase de pedido
  const clasesPedido = await Promise.all([
    prisma.clasePedido.upsert({
      where: { empresa_id_codigo: { empresa_id: empresa.id, codigo: 'VTAPOS' } },
      update: {},
      create: {
        codigo: 'VTAPOS',
        descripcion: 'Venta punto de venta',
        registro_almacen: false,
        registro_caja: false,
        activo: true,
        empresa: { connect: { id: empresa.id } }
      },
    }),
  ])

  // Create Parametros de Sistema
  const parametros = await Promise.all([
    prisma.parametroSistema.upsert({
      where: { empresa_id_nivel_modulo_id_codigo: { empresa_id: empresa.id, modulo_id: comercialModulo.id, codigo: 'POS.PEDVTA', nivel: 'EMPRESA' } },
      update: {},
      create: {
        nivel: 'EMPRESA',
        codigo: 'POS.PEDVTA',
        descripcion: 'Clase pedido para punto de venta',
        tipo_dato: 'STRING',
        valor_string: 'VTAPOS',
        etiqueta: 'PEDVTA',
        activo: true,
        empresa: { connect: { id: empresa.id } },
        modulo: { connect: { id: comercialModulo.id } }
      },
    }),
    prisma.parametroSistema.upsert({
      where: { empresa_id_nivel_modulo_id_codigo: { empresa_id: empresa.id, modulo_id: comercialModulo.id, codigo: 'POS.PREVTA', nivel: 'EMPRESA' } },
      update: {},
      create: {
        nivel: 'EMPRESA',
        codigo: 'POS.PREVTA',
        descripcion: 'Precio de venta para POS',
        tipo_dato: 'STRING',
        valor_string: 'PRCVTA',
        etiqueta: 'PREVTA',
        activo: true,
        empresa: { connect: { id: empresa.id } },
        modulo: { connect: { id: comercialModulo.id } }
      },
    }),
    prisma.parametroSistema.upsert({
      where: { empresa_id_nivel_modulo_id_codigo: { empresa_id: empresa.id, modulo_id: comercialModulo.id, codigo: 'POS.DCTVENTA', nivel: 'EMPRESA' } },
      update: {},
      create: {
        nivel: 'EMPRESA',
        codigo: 'POS.DCTVENTA',
        descripcion: 'Descuento comercial para POS',
        tipo_dato: 'STRING',
        valor_string: 'DCTOVTA',
        etiqueta: 'DCTVENTA',
        activo: true,
        empresa: { connect: { id: empresa.id } },
        modulo: { connect: { id: comercialModulo.id } }
      },
    }),
  ])

  console.log('✅ Seed completed successfully!')
  console.log('')
  console.log('📋 Credenciales de acceso:')
  console.log('   Email: admin@empresademo.com')
  console.log('   Password: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
