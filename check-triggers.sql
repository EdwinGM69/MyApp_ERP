-- Check for triggers using standard information_schema
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'Material'
   OR event_object_table = 'MaterialCosto';
