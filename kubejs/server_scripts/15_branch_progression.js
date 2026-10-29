// Sincroniza hitos de las ramas temáticas con FTB Quests.
// Los capítulos opcionales no sustituyen el rango del Camino del Cazador.

global.MAINCRA_BRANCH_MILESTONES = {
  '2100000000000002': ['maincra_arcane', 1, 'Artes Arcanas I'],
  '2100000000000004': ['maincra_arcane', 2, 'Artes Arcanas II'],
  '2100000000000005': ['maincra_arcane', 3, 'Artes Arcanas III'],
  '2100000000000006': ['maincra_arcane', 4, 'Artes Arcanas IV'],
  '2100000000000007': ['maincra_arcane', 5, 'Artes Arcanas V'],

  '3100000000000002': ['maincra_ocean', 1, 'Océano I'],
  '3100000000000003': ['maincra_ocean', 2, 'Océano II'],
  '3100000000000004': ['maincra_ocean', 3, 'Océano III'],
  '3100000000000005': ['maincra_ocean', 4, 'Océano IV'],

  '4100000000000003': ['maincra_engineering', 1, 'Ingeniería Cinética I'],
  '4100000000000004': ['maincra_engineering', 2, 'Ingeniería Cinética II'],
  '4100000000000005': ['maincra_engineering', 3, 'Ingeniería Cinética III'],
  '4100000000000006': ['maincra_engineering', 4, 'Ingeniería Cinética IV'],

  '5100000000000002': ['maincra_funeral', 1, 'Progreso funerario I'],
  '5100000000000003': ['maincra_funeral', 2, 'Progreso funerario II'],
  '5100000000000004': ['maincra_funeral', 3, 'Progreso funerario III'],
  '5100000000000005': ['maincra_funeral', 4, 'Progreso funerario IV'],

  '6100000000000003': ['maincra_home', 1, 'Hogar y cocina I'],
  '6100000000000005': ['maincra_home', 2, 'Hogar y cocina II'],

  '7100000000000003': ['maincra_explorer', 1, 'Exploración I'],
  '7100000000000004': ['maincra_explorer', 2, 'Exploración II'],
  '7100000000000005': ['maincra_explorer', 3, 'Exploración III']
}

// FTB Quests guarda el progreso por equipo. Por coherencia visual, el evento
// aplica el hito a sus miembros conectados; los desconectados se recuperan con
// /maincra reconcile al volver. El rango del Camino sigue siendo individual.
Object.entries(global.MAINCRA_BRANCH_MILESTONES).forEach(([questId, milestone]) => {
  FTBQuestsEvents.completed(questId, event => {
    event.onlineMembers.forEach(player => {
      let data = global.maincraData(player)
      if (data.getInt(milestone[0]) >= milestone[1]) return

      data.putInt(milestone[0], milestone[1])
      data.putInt('maincra_progression_version', 2)
      global.maincraSyncProgress(player)
      player.tell(Text.aqua(`[Maincra] ${milestone[2]} completado.`))
    })
  })
})
