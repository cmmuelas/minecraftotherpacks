// Ajustes de equilibrio y recetas específicamente acordadas.
ServerEvents.recipes(event => {
  event.remove({ output: 'globalxp:xp_block' })
  event.shaped('globalxp:xp_block', [
    'OEO',
    'DBD',
    'OEO'
  ], {
    O: 'minecraft:obsidian',
    E: 'minecraft:ender_pearl',
    D: 'minecraft:diamond',
    B: 'minecraft:emerald_block'
  }).id('maincra:global_xp_block')

  event.remove({ output: 'create_enchantment_industry:disenchanter' })
  event.shaped('create_enchantment_industry:disenchanter', [
    'EAE',
    'PBP',
    'OCO'
  ], {
    E: 'minecraft:ender_eye',
    A: 'create:andesite_alloy',
    P: 'create:precision_mechanism',
    B: 'minecraft:bookshelf',
    O: 'minecraft:obsidian',
    C: 'create:brass_casing'
  }).id('maincra:disenchanter')
})
