// Tooltips dinámicos de progresión.
// El servidor sincroniza el rango y las ramas. Cada objeto regulado muestra siempre su requisito
// y señala si la fabricación está bloqueada o desbloqueada para el jugador actual.

global.maincraClientProgress = {
  rank: 0,
  arcane: 0,
  ocean: 0,
  engineering: 0,
  funeral: 0,
  home: 0,
  explorer: 0
}

NetworkEvents.dataReceived('maincra_progress', event => {
  global.maincraClientProgress = {
    rank: event.data.getInt('rank'),
    arcane: event.data.getInt('arcane'),
    ocean: event.data.getInt('ocean'),
    engineering: event.data.getInt('engineering'),
    funeral: event.data.getInt('funeral'),
    home: event.data.getInt('home'),
    explorer: event.data.getInt('explorer')
  }
})

function maincraAnnounceTooltipClient(player) {
  if (player) player.sendData('maincra_client_ready', { version: 2 })
}

ClientEvents.loggedIn(event => {
  maincraAnnounceTooltipClient(event.player)
})

// Repite el saludo a baja frecuencia para cubrir recargas de scripts/recursos sin reconectar.
let maincraClientReadyTicker = 0
ClientEvents.tick(event => {
  maincraClientReadyTicker++
  if (maincraClientReadyTicker < 200) return
  maincraClientReadyTicker = 0
  maincraAnnounceTooltipClient(event.player)
})

const MAINCRA_TOOLTIP_GATES = {
  'minecraft:diamond_sword': { rank: 1 },
  'minecraft:diamond_pickaxe': { rank: 1 },
  'minecraft:diamond_axe': { rank: 1 },
  'minecraft:diamond_shovel': { rank: 1 },
  'minecraft:diamond_hoe': { rank: 1 },
  'minecraft:diamond_helmet': { rank: 1 },
  'minecraft:diamond_chestplate': { rank: 1 },
  'minecraft:diamond_leggings': { rank: 1 },
  'minecraft:diamond_boots': { rank: 1 },

  'minecraft:netherite_sword': { rank: 9 },
  'minecraft:netherite_pickaxe': { rank: 9 },
  'minecraft:netherite_axe': { rank: 9 },
  'minecraft:netherite_shovel': { rank: 9 },
  'minecraft:netherite_hoe': { rank: 9 },
  'minecraft:netherite_helmet': { rank: 9 },
  'minecraft:netherite_chestplate': { rank: 9 },
  'minecraft:netherite_leggings': { rank: 9 },
  'minecraft:netherite_boots': { rank: 9 },

  'crittersandcompanions:grappling_hook': { rank: 1 },
  'waystones:waystone': { rank: 3 },
  'waystones:mossy_waystone': { rank: 3 },
  'waystones:sandy_waystone': { rank: 3 },
  'waystones:warp_stone': { rank: 3 },
  'waystones:warp_plate': { rank: 3 },
  'waystones:sharestone': { rank: 3 },
  'broomsmod:wooden_broom': { rank: 6 },
  'globalxp:xp_block': { rank: 6, branch: 'funeral', branchMin: 1, branchLabel: 'progreso funerario I' },

  'travelersbackpack:iron_tier_upgrade': { rank: 1 },
  'travelersbackpack:gold_tier_upgrade': { rank: 2 },
  'travelersbackpack:pickup_upgrade': { rank: 4 },
  'travelersbackpack:refill_upgrade': { rank: 4 },
  'travelersbackpack:magnet_upgrade': { rank: 5 },
  'travelersbackpack:feeding_upgrade': { rank: 6 },
  'travelersbackpack:diamond_tier_upgrade': { rank: 7 },
  'travelersbackpack:netherite_tier_upgrade': { rank: 9 },
  'travelersbackpack:void_upgrade': { rank: 10 },

  'create:precision_mechanism': { rank: 4, branch: 'engineering', branchMin: 1, branchLabel: 'Ingeniería Cinética I' },
  'create:deployer': { rank: 4, branch: 'engineering', branchMin: 1, branchLabel: 'Ingeniería Cinética I' },
  'create:mechanical_crafter': { rank: 4, branch: 'engineering', branchMin: 1, branchLabel: 'Ingeniería Cinética I' },
  'create:brass_casing': { rank: 4, branch: 'engineering', branchMin: 1, branchLabel: 'Ingeniería Cinética I' },
  'create_enchantment_industry:experience_rotor': { rank: 10, branch: 'engineering', branchMin: 2, branchLabel: 'Ingeniería Cinética II' },
  'create_enchantment_industry:disenchanter': { rank: 10, branch: 'engineering', branchMin: 2, branchLabel: 'Ingeniería Cinética II' },
  'create_enchantment_industry:printer': { rank: 12, branch: 'engineering', branchMin: 3, branchLabel: 'Ingeniería Cinética III' },
  'minecraft:enchanted_golden_apple': { rank: 15, branch: 'engineering', branchMin: 4, branchLabel: 'Ingeniería Cinética IV' },

  'irons_spellbooks:gold_spell_book': { rank: 1, branch: 'arcane', branchMin: 1, branchLabel: 'Artes Arcanas I' },
  'irons_spellbooks:uncommon_ink': { rank: 1, branch: 'arcane', branchMin: 1, branchLabel: 'Artes Arcanas I' },
  'irons_spellbooks:diamond_spell_book': { rank: 3, branch: 'arcane', branchMin: 1, branchLabel: 'Artes Arcanas I' },
  'irons_spellbooks:rare_ink': { rank: 3, branch: 'arcane', branchMin: 1, branchLabel: 'Artes Arcanas I' },
  'irons_spellbooks:arcane_anvil': { rank: 3, branch: 'arcane', branchMin: 1, branchLabel: 'Artes Arcanas I' },
  'irons_spellbooks:scroll_forge': { rank: 3, branch: 'arcane', branchMin: 1, branchLabel: 'Artes Arcanas I' },
  'irons_spellbooks:epic_ink': { rank: 8, branch: 'arcane', branchMin: 2, branchLabel: 'Artes Arcanas II' },
  'irons_spellbooks:dragonskin_spell_book': { rank: 10, branch: 'arcane', branchMin: 3, branchLabel: 'Artes Arcanas III' },
  'irons_spellbooks:netherite_spell_book': { rank: 10, branch: 'arcane', branchMin: 3, branchLabel: 'Artes Arcanas III' },
  'irons_spellbooks:legendary_ink': { rank: 13, branch: 'arcane', branchMin: 3, branchLabel: 'Artes Arcanas III' },
  'irons_spellbooks:cinderous_soulcaller': { rank: 15, branch: 'arcane', branchMin: 4, branchLabel: 'Artes Arcanas IV' },

  'aquamirae:terrible_helmet': { rank: 2, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:terrible_chestplate': { rank: 2, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:terrible_leggings': { rank: 2, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:terrible_boots': { rank: 2, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:terrible_sword': { rank: 2, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:poisoned_blade': { rank: 2, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:poisoned_chakra': { rank: 3, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:fin_cutter': { rank: 3, branch: 'ocean', branchMin: 2, branchLabel: 'Océano II' },
  'aquamirae:abyssal_heaume': { rank: 9, branch: 'ocean', branchMin: 4, branchLabel: 'Océano IV' },
  'aquamirae:abyssal_brigantine': { rank: 9, branch: 'ocean', branchMin: 4, branchLabel: 'Océano IV' },
  'aquamirae:abyssal_leggings': { rank: 9, branch: 'ocean', branchMin: 4, branchLabel: 'Océano IV' },
  'aquamirae:abyssal_boots': { rank: 9, branch: 'ocean', branchMin: 4, branchLabel: 'Océano IV' },
  'aquamirae:divider': { rank: 9, branch: 'ocean', branchMin: 4, branchLabel: 'Océano IV' },
  'aquamirae:whisper_of_the_abyss': { rank: 9, branch: 'ocean', branchMin: 4, branchLabel: 'Océano IV' },

  'majruszsdifficulty:enderium_shard_locator': { rank: 10 },
  'majruszsdifficulty:enderium_sword': { rank: 11 },
  'majruszsdifficulty:enderium_pickaxe': { rank: 11 },
  'majruszsdifficulty:enderium_axe': { rank: 11 },
  'majruszsdifficulty:enderium_shovel': { rank: 11 },
  'majruszsdifficulty:enderium_hoe': { rank: 11 },
  'majruszsdifficulty:enderium_helmet': { rank: 12 },
  'majruszsdifficulty:enderium_chestplate': { rank: 12 },
  'majruszsdifficulty:enderium_leggings': { rank: 12 },
  'majruszsdifficulty:enderium_boots': { rank: 12 },
  'tombstone:book_of_repairing': { rank: 12, branch: 'funeral', branchMin: 2, branchLabel: 'progreso funerario II' }
}

function maincraClientGateLocked(gate) {
  let progress = global.maincraClientProgress
  if (progress.rank < gate.rank) return true
  if (gate.branch && progress[gate.branch] < gate.branchMin) return true
  return false
}

function maincraRequirementText(gate) {
  let requirement = `C${gate.rank}`
  if (gate.branch) requirement += ` + ${gate.branchLabel}`
  return requirement
}

ItemEvents.tooltip(event => {
  Object.entries(MAINCRA_TOOLTIP_GATES).forEach(([itemId, gate]) => {
    event.addAdvanced(itemId, (stack, advanced, text) => {
      let locked = maincraClientGateLocked(gate)
      text.add(locked
        ? Text.red('Maincra: fabricación bloqueada')
        : Text.green('Maincra: fabricación desbloqueada'))
      text.add(Text.gold('Requisito: ' + maincraRequirementText(gate)))
      text.add(Text.gray('Los ejemplares encontrados como botín sí pueden usarse antes.'))
    })
  })
})
