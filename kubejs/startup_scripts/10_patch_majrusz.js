// Ajusta la progresión de Majrusz para el orden de Maincra.
// La configuración se escribe de forma idempotente. Tras la primera instalación,
// reinicia una segunda vez para garantizar que Majrusz lea el archivo ya parcheado.

try {
  let path = 'config/majruszsdifficulty.json'
  let cfg = JsonIO.read(path)
  if (cfg && cfg.game_stages && cfg.game_stages.list && cfg.game_stages.list.length >= 3) {
    cfg.game_stages.is_per_player_difficulty_enabled = true

    let expert = cfg.game_stages.list.find(stage => stage.id == 'expert')
    let master = cfg.game_stages.list.find(stage => stage.id == 'master')

    if (expert) {
      expert.triggers.dimensions = []
      expert.triggers.entities = ['majruszsdifficulty:tank']
    }

    if (master) {
      master.triggers.dimensions = []
      master.triggers.entities = ['aquamirae:captain_cornelia']
    }

    JsonIO.write(path, cfg)
    console.info('[Maincra] Configuración de Majrusz preparada: Expert tras Tank, Master tras Cornelia.')
  } else {
    console.warn('[Maincra] No se pudo reconocer config/majruszsdifficulty.json; no se modificó.')
  }
} catch (error) {
  console.error('[Maincra] Error al preparar la configuración de Majrusz: ' + error)
}
