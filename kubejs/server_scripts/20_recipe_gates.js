// Restricciones de fabricación de Maincra.
// Las recetas normales de mesa se bloquean antes de producir un resultado mediante stages por jugador.
// Los objetos encontrados o soltados por jefes siguen siendo utilizables.

const MAINCRA_GATES = [
  { min: 1, items: ['minecraft:diamond_sword','minecraft:diamond_pickaxe','minecraft:diamond_axe','minecraft:diamond_shovel','minecraft:diamond_hoe','minecraft:diamond_helmet','minecraft:diamond_chestplate','minecraft:diamond_leggings','minecraft:diamond_boots'] },
  { min: 9, items: ['minecraft:netherite_sword','minecraft:netherite_pickaxe','minecraft:netherite_axe','minecraft:netherite_shovel','minecraft:netherite_hoe','minecraft:netherite_helmet','minecraft:netherite_chestplate','minecraft:netherite_leggings','minecraft:netherite_boots'] },
  { min: 1, items: ['crittersandcompanions:grappling_hook'] },
  { min: 3, items: ['waystones:waystone','waystones:mossy_waystone','waystones:sandy_waystone','waystones:warp_stone','waystones:warp_plate','waystones:sharestone'] },
  { min: 6, branch: 'maincra_funeral', branchMin: 1, branchLabel: 'progreso funerario I', items: ['globalxp:xp_block'] },
  { min: 6, items: ['broomsmod:wooden_broom'] },

  { min: 1, items: ['travelersbackpack:iron_tier_upgrade'] },
  { min: 2, items: ['travelersbackpack:gold_tier_upgrade'] },
  { min: 4, items: ['travelersbackpack:pickup_upgrade','travelersbackpack:refill_upgrade'] },
  { min: 5, items: ['travelersbackpack:magnet_upgrade'] },
  { min: 6, items: ['travelersbackpack:feeding_upgrade'] },
  { min: 7, items: ['travelersbackpack:diamond_tier_upgrade'] },
  { min: 9, items: ['travelersbackpack:netherite_tier_upgrade'] },
  { min: 10, items: ['travelersbackpack:void_upgrade'] },

  { min: 4, branch: 'maincra_engineering', branchMin: 1, branchLabel: 'Ingeniería Cinética I', items: ['create:precision_mechanism','create:deployer','create:mechanical_crafter','create:brass_casing'] },
  { min: 10, branch: 'maincra_engineering', branchMin: 2, branchLabel: 'Ingeniería Cinética II', items: ['create_enchantment_industry:experience_rotor','create_enchantment_industry:disenchanter'] },
  { min: 12, branch: 'maincra_engineering', branchMin: 3, branchLabel: 'Ingeniería Cinética III', items: ['create_enchantment_industry:printer'] },
  { min: 15, branch: 'maincra_engineering', branchMin: 4, branchLabel: 'Ingeniería Cinética IV', items: ['minecraft:enchanted_golden_apple'] },

  { min: 1, branch: 'maincra_arcane', branchMin: 1, branchLabel: 'Artes Arcanas I', items: ['irons_spellbooks:gold_spell_book','irons_spellbooks:uncommon_ink'] },
  { min: 3, branch: 'maincra_arcane', branchMin: 1, branchLabel: 'Artes Arcanas I', items: ['irons_spellbooks:diamond_spell_book','irons_spellbooks:rare_ink','irons_spellbooks:arcane_anvil','irons_spellbooks:scroll_forge'] },
  { min: 8, branch: 'maincra_arcane', branchMin: 2, branchLabel: 'Artes Arcanas II', items: ['irons_spellbooks:epic_ink'] },
  { min: 10, branch: 'maincra_arcane', branchMin: 3, branchLabel: 'Artes Arcanas III', items: ['irons_spellbooks:dragonskin_spell_book','irons_spellbooks:netherite_spell_book'] },
  { min: 13, branch: 'maincra_arcane', branchMin: 3, branchLabel: 'Artes Arcanas III', items: ['irons_spellbooks:legendary_ink'] },
  { min: 15, branch: 'maincra_arcane', branchMin: 4, branchLabel: 'Artes Arcanas IV', items: ['irons_spellbooks:cinderous_soulcaller'] },

  { min: 2, branch: 'maincra_ocean', branchMin: 2, branchLabel: 'Océano II', items: ['aquamirae:terrible_helmet','aquamirae:terrible_chestplate','aquamirae:terrible_leggings','aquamirae:terrible_boots','aquamirae:terrible_sword','aquamirae:poisoned_blade'] },
  { min: 3, branch: 'maincra_ocean', branchMin: 2, branchLabel: 'Océano II', items: ['aquamirae:poisoned_chakra','aquamirae:fin_cutter'] },
  { min: 9, branch: 'maincra_ocean', branchMin: 4, branchLabel: 'Océano IV', items: ['aquamirae:abyssal_heaume','aquamirae:abyssal_brigantine','aquamirae:abyssal_leggings','aquamirae:abyssal_boots','aquamirae:divider','aquamirae:whisper_of_the_abyss'] },

  { min: 10, items: ['majruszsdifficulty:enderium_shard_locator'] },
  { min: 11, items: ['majruszsdifficulty:enderium_sword','majruszsdifficulty:enderium_pickaxe','majruszsdifficulty:enderium_axe','majruszsdifficulty:enderium_shovel','majruszsdifficulty:enderium_hoe'] },
  { min: 12, items: ['majruszsdifficulty:enderium_helmet','majruszsdifficulty:enderium_chestplate','majruszsdifficulty:enderium_leggings','majruszsdifficulty:enderium_boots'] },
  { min: 12, branch: 'maincra_funeral', branchMin: 2, branchLabel: 'progreso funerario II', items: ['tombstone:book_of_repairing'] }
]

function maincraGateStage(gate) {
  let stage = `maincra_recipe_c${gate.min}`
  if (gate.branch) stage += `_${gate.branch.replace('maincra_', '')}_${gate.branchMin}`
  return stage
}

function maincraGateFor(itemId) {
  return MAINCRA_GATES.find(gate => gate.items.includes(itemId))
}

function maincraGateIsOpen(player, gate) {
  let data = global.maincraData(player)
  let rankOk = data.getInt('maincra_rank') >= gate.min
  let branchOk = !gate.branch || data.getInt(gate.branch) >= gate.branchMin
  return rankOk && branchOk
}

// KubeJS transforma las recetas shaped/shapeless con stage en recetas propias.
// Si el jugador no posee el stage, el servidor devuelve un resultado vacío y vanilla no consume nada.
ServerEvents.recipes(event => {
  MAINCRA_GATES.forEach(gate => {
    let stage = maincraGateStage(gate)
    gate.items.forEach(itemId => {
      event.stage({ type: 'minecraft:crafting_shaped', output: itemId }, stage)
      event.stage({ type: 'minecraft:crafting_shapeless', output: itemId }, stage)
    })
  })
})

global.maincraSyncRecipeStages = player => {
  if (!player) return
  let synchronized = {}
  MAINCRA_GATES.forEach(gate => {
    let stage = maincraGateStage(gate)
    if (synchronized[stage]) return
    synchronized[stage] = true
    player.stages.set(stage, maincraGateIsOpen(player, gate))
  })
}

let maincraGateSyncTicker = 0
ServerEvents.tick(event => {
  maincraGateSyncTicker++
  if (maincraGateSyncTicker < 40) return
  maincraGateSyncTicker = 0
  event.server.players.forEach(player => global.maincraSyncRecipeStages(player))
})

// Detecta clientes que no llevan la carpeta kubejs/client_scripts actualizada.
global.maincraClientsWithProgressTooltips = global.maincraClientsWithProgressTooltips || {}

NetworkEvents.dataReceived('maincra_client_ready', event => {
  let key = String(event.player.uuid)
  global.maincraClientsWithProgressTooltips[key] = true
  global.maincraSyncRecipeStages(event.player)
  if (global.maincraSyncProgress) global.maincraSyncProgress(event.player)
})

PlayerEvents.loggedIn(event => {
  let player = event.player
  let key = String(player.uuid)
  delete global.maincraClientsWithProgressTooltips[key]
  global.maincraSyncRecipeStages(player)

  event.server.scheduleInTicks(120, () => {
    if (!player || global.maincraClientsWithProgressTooltips[key]) return
    player.tell(Text.yellow('[Maincra] Tu cliente no ha cargado los avisos de progresión.'))
    player.tell(Text.gray('Actualiza el modpack completo, incluida kubejs/client_scripts, para ver en JEI cuándo se desbloquea cada receta.'))
  })
})

PlayerEvents.loggedOut(event => {
  delete global.maincraClientsWithProgressTooltips[String(event.player.uuid)]
})

// Defensa secundaria para cualquier receta regulada que no sea shaped/shapeless.
// Solo permite una devolución pendiente por jugador, evitando la carrera que duplicaba objetos al hacer clic repetidamente.
global.maincraPendingCraftRefunds = global.maincraPendingCraftRefunds || {}

function maincraRestoreCraftingGrid(player, inventory, snapshot, key) {
  try {
    for (let slot = 0; slot < snapshot.length; slot++) {
      inventory.setStackInSlot(slot, snapshot[slot].copy())
    }
    inventory.setChanged()
    if (player.containerMenu) player.containerMenu.broadcastChanges()
    player.sendInventoryUpdate()
  } finally {
    delete global.maincraPendingCraftRefunds[key]
  }
}

ItemEvents.crafted(event => {
  let itemId = String(event.item.id)
  let gate = maincraGateFor(itemId)
  if (!gate || maincraGateIsOpen(event.player, gate)) return

  event.item.count = 0

  let key = String(event.player.uuid)
  if (global.maincraPendingCraftRefunds[key]) return
  global.maincraPendingCraftRefunds[key] = true

  let inventory = event.inventory
  let snapshot = []
  for (let slot = 0; slot < inventory.slots; slot++) {
    snapshot.push(inventory.getStackInSlot(slot).copy())
  }

  event.server.scheduleInTicks(1, () => maincraRestoreCraftingGrid(event.player, inventory, snapshot, key))

  let reason = `rango C${gate.min}`
  if (gate.branch) reason += ` y ${gate.branchLabel}`
  event.player.tell(Text.red(`[Maincra] Fabricación bloqueada: requiere ${reason}.`))
  event.player.tell(Text.gray('No se ha creado el objeto y los materiales permanecen intactos.'))
})

// Corail Tombstone: los encantamientos del mod quedan fuera de Maincra.
// La config oficial impide que se generen/apliquen nuevos. Esta segunda defensa
// elimina cualquier encantamiento tombstone:* que ya exista en objetos de jugadores.
const MAINCRA_TOMBSTONE_ENCHANT_HELPER = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper')
const MAINCRA_FORGE_REGISTRIES = Java.loadClass('net.minecraftforge.registries.ForgeRegistries')

function maincraStripTombstoneEnchantments(stack) {
  if (!stack || stack.empty) return false

  let enchantments = MAINCRA_TOMBSTONE_ENCHANT_HELPER.getEnchantments(stack)
  if (!enchantments || enchantments.isEmpty()) return false

  let changed = false
  let iterator = enchantments.entrySet().iterator()
  while (iterator.hasNext()) {
    let entry = iterator.next()
    let enchantmentId = MAINCRA_FORGE_REGISTRIES.ENCHANTMENTS.getKey(entry.getKey())
    if (enchantmentId && enchantmentId.getNamespace() === 'tombstone') {
      iterator.remove()
      changed = true
    }
  }

  if (changed) MAINCRA_TOMBSTONE_ENCHANT_HELPER.setEnchantments(enchantments, stack)
  return changed
}

PlayerEvents.loggedIn(event => {
  event.player.inventory.allItems.forEach(stack => maincraStripTombstoneEnchantments(stack))
})

PlayerEvents.inventoryChanged(event => {
  maincraStripTombstoneEnchantments(event.item)
})
