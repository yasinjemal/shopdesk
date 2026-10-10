(function(root){
  'use strict';
  // A built-in product catalogue for the shops Handbill serves. Each entry has
  // the sizes that are commonly sold, a department, an illustration and the
  // words people actually type. Prices are never included: they are always the
  // person's own. Brand names are left out on purpose; people add them freely.
  //
  // Row format: [name, sizes, section, illustration, synonyms, business]
  const B={g:'grocery',f:'food',b:'beauty',s:'services',w:'fashion',h:'general'};
  const rows=[
    // Pantry staples
    ['Maize meal','1 kg|2.5 kg|5 kg|10 kg|12.5 kg|25 kg','Pantry','sack','mielie meal|mealie meal|pap|super maize meal|maize',B.g],
    ['Samp','1 kg|2.5 kg|5 kg|10 kg','Pantry','sack','stamp mielies|samp and beans',B.g],
    ['Rice','1 kg|2 kg|5 kg|10 kg|25 kg','Pantry','sack','long grain rice|parboiled rice|basmati rice|white rice',B.g],
    ['Cake flour','1 kg|2.5 kg|5 kg|10 kg|12.5 kg','Pantry','sack','flour|white flour|bread flour|self raising flour',B.g],
    ['White sugar','1 kg|2.5 kg|5 kg|10 kg|25 kg','Pantry','sack','sugar|brown sugar|castor sugar',B.g],
    ['Sunflower oil','750 ml|2 L|5 L|20 L','Pantry','bottle','cooking oil|oil|vegetable oil|canola oil',B.g],
    ['Sugar beans','500 g|1 kg|2 kg|5 kg','Pantry','bag','beans|speckled beans|dry beans|red speckled sugar beans',B.g],
    ['Lentils','500 g|1 kg','Pantry','bag','dhal|dal|split peas',B.g],
    ['Baked beans','410 g|3 × 410 g|6 × 410 g','Pantry','can','beans in tomato sauce|tinned beans',B.g],
    ['Pilchards','155 g|215 g|400 g','Pantry','can','tinned fish|fish in tomato sauce|sardines',B.g],
    ['Tuna','170 g|3 × 170 g','Pantry','can','tinned tuna|shredded tuna',B.g],
    ['Corned meat','300 g','Pantry','can','bully beef|corned beef|tinned meat',B.g],
    ['Tinned tomatoes','410 g','Pantry','can','chopped tomatoes|tomato puree|tomato paste 50 g',B.g],
    ['Tomato sauce','500 ml|700 ml|2 L','Pantry','bottle','ketchup|tomato ketchup',B.g],
    ['Mayonnaise','375 g|750 g|1.5 kg','Pantry','jar','mayo|salad cream',B.g],
    ['Chutney','460 g|1.1 kg','Pantry','jar','fruit chutney|hot chutney',B.g],
    ['Peanut butter','400 g|800 g|1 kg','Pantry','jar','peanutbutter',B.g],
    ['Jam','450 g|900 g','Pantry','jar','apricot jam|mixed fruit jam|strawberry jam',B.g],
    ['Instant coffee','50 g|100 g|200 g|750 g','Pantry','jar','coffee|ricoffy|chicory coffee|ground coffee',B.g],
    ['Tea bags','26s|40s|80s|100s|200s','Pantry','box','tea|black tea|tagless tea bags',B.g],
    ['Rooibos tea','40s|80s|100s','Pantry','box','rooibos|red bush tea',B.g],
    ['Coffee creamer','250 g|500 g|1 kg','Pantry','jar','creamer|cremora|whitener',B.g],
    ['Hot chocolate','250 g|500 g|1 kg','Pantry','jar','drinking chocolate|milo',B.g],
    ['Soup packet','50 g|60 g','Pantry','pouch','packet soup|instant soup|oxtail soup|minestrone',B.g],
    ['Stock cubes','12s|24s|48s','Pantry','box','stock|beef stock|chicken stock|knorrox',B.g],
    ['Seasoning','75 g|200 g|1 kg','Pantry','jar','aromat|spice|all purpose seasoning|braai spice|chicken spice|bbq spice|rajah curry powder',B.g],
    ['Cooking salt','500 g|1 kg|5 kg','Pantry','bag','salt|iodated salt|table salt|coarse salt',B.g],
    ['Spaghetti','500 g|1 kg|3 kg','Pantry','bag','pasta|macaroni|penne|screws|noodles',B.g],
    ['Instant noodles','73 g|5 pack|10 pack','Pantry','pouch','noodles|2 minute noodles|maggi',B.g],
    ['Breakfast cereal','500 g|750 g|1 kg','Pantry','box','corn flakes|cornflakes|weet-bix|cereal|muesli|rice crispies',B.g],
    ['Oats','500 g|1 kg','Pantry','box','porridge|jungle oats|oatmeal|instant porridge',B.g],
    ['Mabele','1 kg|2.5 kg','Pantry','bag','sorghum porridge|morvite|maltabella|soft porridge',B.g],
    ['Custard powder','250 g|500 g|1 kg','Pantry','box','custard',B.g],
    ['Jelly','40 g|80 g','Pantry','box','jelly powder',B.g],
    ['Baking powder','100 g|200 g','Pantry','jar','yeast 10 g|bicarbonate of soda|baking soda',B.g],
    ['Vinegar','750 ml|2 L','Pantry','bottle','white vinegar|brown vinegar|spirit vinegar',B.g],
    ['Atchar','400 g|1 kg','Pantry','jar','achar|mango atchar|vegetable atchar',B.g],
    ['Soya mince','200 g|400 g|1 kg','Pantry','pouch','soya|imana|textured vegetable protein',B.g],
    ['Juice concentrate','1 L|2 L|5 L','Pantry','bottle','cold drink concentrate|oros|squash|cordial',B.g],
    ['Powdered milk','400 g|900 g|1 kg','Dairy & eggs','pouch','milk powder|klim|elite',B.g],
    ['Condensed milk','385 g','Pantry','can','sweetened condensed milk',B.g],
    ['Evaporated milk','380 g','Pantry','can','ideal milk',B.g],
    // Dairy & eggs
    ['Full cream milk','1 L|2 L|6 × 1 L','Dairy & eggs','carton','milk|fresh milk|low fat milk|2% milk',B.g],
    ['Long life milk','1 L|6 × 1 L','Dairy & eggs','carton','uht milk|long-life milk|clover|parmalat',B.g],
    ['Amasi','1 L|2 L','Dairy & eggs','carton','maas|sour milk|inkomazi|mageu 1 L',B.g],
    ['Yoghurt','175 ml|6 × 100 ml|1 kg|2 kg','Dairy & eggs','cup','yogurt|drinking yoghurt',B.g],
    ['Margarine','500 g|1 kg','Dairy & eggs','tub','rama|stork|brick margarine|spread|butter spread',B.g],
    ['Butter','250 g|500 g','Dairy & eggs','tub','salted butter',B.g],
    ['Cheese','400 g|900 g|per kg','Dairy & eggs','cheese','cheddar|gouda|cheese slices|processed cheese',B.g],
    ['Large eggs','6 pack|12 pack|18 pack|30 tray|60 tray','Dairy & eggs','egg','eggs|egg tray|medium eggs|extra large eggs|jumbo eggs',B.g],
    // Bakery
    ['White bread','600 g|700 g','Bakery','bread','bread|loaf|sliced bread|white loaf|government loaf',B.g],
    ['Brown bread','600 g|700 g','Bakery','bread','brown loaf|whole wheat bread|seed loaf',B.g],
    ['Rolls','6 pack|12 pack','Bakery','roll','bread rolls|hot dog rolls|hamburger rolls|buns',B.g],
    ['Scones','4 pack|6 pack|each','Bakery','pastry','scone',B.g],
    ['Muffins','4 pack|6 pack|each','Bakery','pastry','muffin|bran muffin',B.g],
    ['Doughnuts','6 pack|each','Bakery','pastry','donuts|donut|doughnut',B.g],
    ['Vetkoek','6 pack|each','Bakery','pastry','fat cakes|magwinya|amagwinya|fat cook',B.g],
    ['Cake','Whole|Slice|Half','Bakery','cake','chocolate cake|birthday cake|sponge cake|carrot cake|red velvet',B.g],
    ['Cupcakes','6 pack|12 pack','Bakery','cake','cup cakes',B.g],
    ['Rusks','450 g|500 g|1 kg','Bakery','pastry','buttermilk rusks|beskuit',B.g],
    ['Biscuits','200 g|400 g|1 kg','Snacks','box','cookies|marie biscuits|tennis biscuits|eet sum mor',B.g],
    // Butchery
    ['Beef mince','500 g|1 kg|Per kg','Butchery','meat','mince|minced beef|lean mince|ground beef',B.g],
    ['Stewing beef','Per kg|1 kg','Butchery','meat','beef stew|stew meat|goulash|beef cubes',B.g],
    ['Beef steak','Per kg|500 g','Butchery','meat','steak|rump steak|sirloin|t-bone|chuck',B.g],
    ['Beef brisket','Per kg','Butchery','meat','brisket',B.g],
    ['Beef bones','Per kg|1 kg','Butchery','meat','soup bones|marrow bones|shin',B.g],
    ['Boerewors','Per kg|500 g|1 kg','Butchery','sausage','wors|braai wors|sausage|farm sausage',B.g],
    ['Chicken braai pack','2 kg|5 kg','Butchery','chicken','braai pack|chicken pack|mixed portions',B.g],
    ['Chicken pieces','2 kg|5 kg|10 kg','Butchery','chicken','iqf chicken|frozen chicken portions|chicken portions|mixed pieces|chicken quarters',B.g],
    ['Whole chicken','Each|Per kg|1.3 kg|1.5 kg|1.8 kg','Butchery','chicken','fresh chicken|frozen chicken|whole bird',B.g],
    ['Chicken fillets','Per kg|1 kg','Butchery','chicken','chicken breasts|breast fillets|chicken breast',B.g],
    ['Chicken wings','1 kg|2 kg|Per kg','Butchery','chicken','wings',B.g],
    ['Chicken drumsticks','1 kg|2 kg|Per kg','Butchery','chicken','drumsticks|drumstix|chicken legs|thighs',B.g],
    ['Chicken feet','1 kg|2 kg|Per kg','Butchery','chicken','walkie talkies|feet|runaways',B.g],
    ['Chicken livers','250 g|500 g|1 kg','Butchery','meat','livers|chicken giblets|gizzards|necks|heads and feet',B.g],
    ['Pork chops','Per kg|1 kg','Butchery','meat','pork|pork belly|pork ribs|pork shoulder',B.g],
    ['Lamb chops','Per kg|1 kg','Butchery','meat','lamb|mutton|mutton chops|lamb braai chops|loin chops',B.g],
    ['Mutton stew','Per kg|1 kg','Butchery','meat','mutton|lamb stew|goat meat|sheep',B.g],
    ['Tripe','Per kg|1 kg','Butchery','meat','mogodu|offal|ox tripe|usu|intestines',B.g],
    ['Polony','1 kg|2.5 kg|3 kg','Butchery','sausage','french polony|garlic polony|chicken polony',B.g],
    ['Viennas','500 g|1 kg|2 kg','Butchery','sausage','vienna sausages|cheese grillers|hot dogs',B.g],
    ['Russians','500 g|1 kg','Butchery','sausage','russian sausage|smoked russians',B.g],
    ['Bacon','200 g|250 g|1 kg','Butchery','meat','streaky bacon|back bacon|shoulder bacon',B.g],
    ['Beef patties','4 pack|8 pack|1 kg','Butchery','meat','burger patties|patties',B.g],
    ['Hake fillets','500 g|800 g|Per kg','Butchery','fish','fish|frozen fish|hake|fish fillets',B.g],
    ['Snoek','Per kg|Each','Butchery','fish','fresh fish|smoked snoek',B.g],
    // Fresh produce
    ['Potatoes','2 kg|7 kg pocket|10 kg pocket|Per kg','Fresh produce','potato','potato|aartappels|amazambane|ditapole',B.g],
    ['Onions','2 kg|7 kg pocket|10 kg pocket|Per kg','Fresh produce','onion','onion|red onions|uie',B.g],
    ['Tomatoes','1 kg|3 kg box|6 kg box|Per kg','Fresh produce','tomato','tomato|jam tomatoes|cherry tomatoes',B.g],
    ['Cabbage','Each|Half','Fresh produce','cabbage','kool|iklabishi',B.g],
    ['Butternut','Each|Per kg|2 kg','Fresh produce','pumpkin','pumpkin|hubbard squash|gem squash',B.g],
    ['Spinach','Bunch|Each','Fresh produce','leaf','morogo|imifino|swiss chard|kale',B.g],
    ['Carrots','1 kg|5 kg|Per kg','Fresh produce','carrot','carrot|wortels',B.g],
    ['Bananas','1.5 kg bag|Per kg|Each','Fresh produce','banana','banana|ubhanana',B.g],
    ['Apples','1.5 kg bag|3 kg bag|Per kg','Fresh produce','apple','apple|golden delicious|top red|granny smith',B.g],
    ['Oranges','3 kg bag|7 kg pocket|Per kg','Fresh produce','citrus','orange|naartjies|naartjie|lemons|grapefruit|clementines',B.g],
    ['Avocados','Each|4 pack','Fresh produce','avocado','avos|avo|avocado',B.g],
    ['Green peppers','3 pack|Each|Per kg','Fresh produce','pepper','peppers|bell peppers|red peppers|chillies',B.g],
    ['Garlic','Each|100 g|3 pack','Fresh produce','onion','ginger|garlic and ginger',B.g],
    ['Sweet potatoes','1 kg|2 kg|Per kg','Fresh produce','potato','sweet potato|ubhatata',B.g],
    ['Lettuce','Each','Fresh produce','leaf','salad|iceberg lettuce|mixed salad',B.g],
    ['Cucumber','Each|3 pack','Fresh produce','cucumber','cucumbers',B.g],
    ['Beetroot','Bunch|1 kg','Fresh produce','beetroot','beet',B.g],
    ['Mealies','Each|3 pack|Dozen','Fresh produce','corn','green mealies|corn on the cob|sweetcorn|maize cob',B.g],
    ['Watermelon','Each|Half','Fresh produce','melon','melon|spanspek|sweet melon',B.g],
    ['Grapes','500 g|1 kg','Fresh produce','grapes','grape',B.g],
    ['Pears','1.5 kg bag|Per kg','Fresh produce','pear','pear|peaches|plums|nectarines',B.g],
    ['Mangoes','Each|4 pack|Per kg','Fresh produce','mango','mango|paw paw|papaya|pineapple|litchis',B.g],
    ['Strawberries','250 g|500 g','Fresh produce','berry','berries|blueberries',B.g],
    ['Mushrooms','250 g|500 g','Fresh produce','mushroom','mushroom|button mushrooms',B.g],
    // Frozen
    ['Frozen chips','1 kg|1.5 kg|2.5 kg','Frozen','fries','chips|slap chips|oven chips|french fries',B.g],
    ['Mixed vegetables','500 g|1 kg|2 kg','Frozen','bag','frozen veg|frozen vegetables|peas|corn kernels',B.g],
    ['Fish fingers','400 g|800 g','Frozen','box','fishfingers|crumbed fish',B.g],
    ['Ice cream','1 L|2 L|5 L','Frozen','icecream','icecream|soft serve|ice lollies',B.g],
    ['Ice','2 kg|4 kg','Frozen','bag','ice cubes|bag of ice|block ice',B.g],
    ['Frozen pie','Each|4 pack','Frozen','pie','pies|meat pie|chicken pie|steak and kidney pie',B.g],
    // Beverages
    ['Soft drinks','330 ml|500 ml|1 L|1.25 L|2 L|2.25 L|6 × 330 ml|24 × 330 ml','Beverages','softdrink','cold drink|cooldrink|coke|fizzy drink|cola|lemonade|fanta|sprite',B.g],
    ['Fruit juice','1 L|1.5 L|2 L|6 × 200 ml','Beverages','juice','juice|orange juice|apple juice|mango juice|guava juice',B.g],
    ['Still water','500 ml|1.5 L|5 L|24 × 500 ml','Beverages','water','water|bottled water|sparkling water|mineral water',B.g],
    ['Energy drink','250 ml|500 ml|24 × 500 ml','Beverages','softdrink','energy|monster|play|dragon',B.g],
    ['Mageu','1 L|2 L|500 ml','Beverages','carton','maheu|mahewu|sour porridge drink',B.g],
    ['Flavoured milk','300 ml|1 L','Beverages','carton','steri stumpie|milkshake|chocolate milk',B.g],
    // Snacks & sweets
    ['Chips (snack)','36 g|125 g|150 g|Box of 48','Snacks','pouch','crisps|simba|lays|niknaks|nik naks|doritos|snacks',B.g],
    ['Sweets','1 kg|2 kg|Box of 100','Snacks','sweets','candy|lollipops|chappies|bubblegum|jelly tots|toffees',B.g],
    ['Chocolate','80 g|150 g|Slab|Box of 24','Snacks','chocolate','chocolate slab|chocolate bar|kit kat|bar one|lunch bar',B.g],
    ['Popcorn','100 g|400 g','Snacks','pouch','popping corn|microwave popcorn',B.g],
    ['Peanuts','100 g|500 g|1 kg','Snacks','pouch','nuts|salted peanuts|raw peanuts|cashews',B.g],
    ['Dried fruit','250 g|500 g','Snacks','pouch','raisins|dried peaches|safari',B.g],
    // Household
    ['Washing powder','1 kg|2 kg|3 kg|5 kg|10 kg','Household','box','laundry powder|omo|sunlight washing powder|surf|maq|detergent|auto washing powder|handwash powder',B.g],
    ['Dishwashing liquid','400 ml|750 ml|1.5 L|5 L','Household','spray','sunlight liquid|dish soap|dishwash|washing up liquid',B.g],
    ['Bleach','750 ml|1.5 L|5 L','Household','bottle','jik|domestos|thick bleach|toilet cleaner',B.g],
    ['Bar soap','500 g|1 kg|4 × 125 g','Household','soap','green bar|sunlight bar|laundry soap|boerseep|blue bar',B.g],
    ['Fabric softener','800 ml|2 L|5 L','Household','bottle','sta-soft|comfort|softener',B.g],
    ['Toilet paper','4 pack|9 pack|18 pack|24 pack|48 pack','Household','roll','toilet rolls|toilet tissue|loo rolls|1 ply|2 ply',B.g],
    ['Paper towel','2 pack|4 pack','Household','roll','kitchen towel|roller towel|paper towels',B.g],
    ['Bin bags','10 pack|20 pack|50 pack','Household','bag','refuse bags|black bags|dustbin bags|rubbish bags',B.g],
    ['Candles','6 pack|12 pack|Box of 48','Household','candle','candle|household candles|white candles',B.g],
    ['Matches','10 pack|Carton of 100','Household','box','match|lion matches|lighter',B.g],
    ['Paraffin','1 L|5 L|20 L','Household','jerrycan','parrafin|illuminating paraffin|lamp oil',B.g],
    ['Gas refill','3 kg|5 kg|9 kg|19 kg|48 kg','Household','gascylinder','lp gas|gas bottle|gas cylinder|lpg',B.g],
    ['Floor polish','350 ml|750 ml','Household','tub','cobra|sunbeam|floor wax',B.g],
    ['Floor cleaner','750 ml|1.5 L|5 L','Household','bottle','handy andy|pine gel|all purpose cleaner|disinfectant|dettol',B.g],
    ['Air freshener','300 ml|Each','Household','spray','airfreshener|room spray|toilet freshener',B.g],
    ['Insect spray','300 ml|Each','Household','spray','doom|insecticide|cockroach spray|mosquito coils|rat poison',B.g],
    ['Firelighters','24 pack|48 pack','Household','box','fire lighters|blitz',B.g],
    ['Charcoal','4 kg|5 kg|10 kg','Household','sack','braai charcoal|briquettes|wood|braai wood',B.g],
    ['Broom','Each','Household','broom','mop|sweeping broom|dustpan|bucket',B.g],
    ['Scourers','3 pack|6 pack','Household','sponge','steel wool|sponge|dish cloth|cleaning cloths',B.g],
    ['Batteries','2 pack|4 pack|8 pack','Household','battery','aa batteries|aaa batteries|torch batteries|torch',B.g],
    ['Light bulb','Each|2 pack','Household','bulb','bulbs|led bulb|globe|energy saver',B.g],
    ['Foil & cling wrap','Each|30 m','Household','roll','tin foil|foil|cling film|wax paper|sandwich bags',B.g],
    // Personal care
    ['Bath soap','100 g|175 g|4 pack|6 pack','Personal care','soap','lux|protex|lifebuoy|dove soap|body soap',B.g],
    ['Body lotion','200 ml|400 ml|500 ml','Personal care','lotion','lotion|vaseline lotion|nivea|dawn|body cream',B.g],
    ['Petroleum jelly','50 ml|100 ml|250 ml|500 ml','Personal care','tub','vaseline|blue seal|zam-buk|camphor cream',B.g],
    ['Roll-on','50 ml|2 pack','Personal care','tube','deodorant|roll on|shield|body spray|axe',B.g],
    ['Toothpaste','50 ml|100 ml|2 pack','Personal care','tube','colgate|aquafresh|tooth paste|toothbrush',B.g],
    ['Shampoo','200 ml|400 ml|1 L','Personal care','bottle','conditioner|hair food|relaxer|hair gel',B.g],
    ['Sanitary pads','8s|10s|16s|20s','Personal care','pouch','pads|always|tampons|panty liners',B.g],
    ['Razors','3 pack|5 pack|10 pack','Personal care','razor','disposable razors|shaving blades|minora|shaving cream',B.g],
    ['Tissues','Box|2 pack|Pocket pack','Personal care','box','facial tissues|baby soft',B.g],
    ['Cotton wool','100 g|200 g','Personal care','pouch','earbuds|cotton buds|cotton pads',B.g],
    ['Hair extensions','Each|Pack','Personal care','hair','braids|weave|brazilian hair|wig|hair piece|synthetic hair|x-pression',B.g],
    // Baby
    ['Nappies','Size 1|Size 2|Size 3|Size 4|Size 5|Jumbo pack|Mega pack','Baby','nappy','diapers|pampers|huggies|cuddlers|pull-ups',B.g],
    ['Baby wipes','80s|72s|3 × 80s','Baby','pouch','wipes|wet wipes',B.g],
    ['Baby formula','400 g|900 g|1.8 kg','Baby','can','formula|nan|infacare|s-26|baby milk',B.g],
    ['Baby cereal','250 g|500 g','Baby','box','purity|cerelac|nestum|baby porridge|baby food',B.g],
    ['Baby lotion','200 ml|500 ml','Baby','lotion','baby oil|baby powder|bum cream|baby soap|johnsons',B.g],
    // Pet
    ['Dog food','1.75 kg|8 kg|20 kg|25 kg','Pet','pet','dog pellets|dog kibble|dog chunks|bobtail|dog meal',B.g],
    ['Cat food','1 kg|4 kg|Tin 385 g','Pet','pet','cat pellets|whiskas|kitten food|cat litter',B.g],
    // Cellphone & airtime
    ['Airtime','R5|R10|R12|R29|R55|R110','Airtime & data','phone','vodacom airtime|mtn airtime|cell c airtime|telkom airtime|recharge',B.g],
    ['Data bundle','500 MB|1 GB|2 GB|5 GB|10 GB','Airtime & data','phone','data|internet bundle|wifi voucher',B.g],
    ['Electricity','R20|R50|R100|R200|R500','Airtime & data','bulb','prepaid electricity|eskom|electricity voucher|units',B.g],
    ['Phone charger','Each','Airtime & data','phone','charger|usb cable|earphones|phone cover|power bank|screen protector',B.g],
    // Stationery & school
    ['Exercise books','Each|10 pack|72 page|192 page','Stationery','book','exercise book|a4 book|counter book|school books',B.g],
    ['Pens','Each|10 pack|Box of 50','Stationery','pen','pen|ballpoint|bic|pencils|hb pencils|crayons|markers',B.g],
    ['School bag','Each','Stationery','bag-fashion','backpack|satchel|lunch box|pencil case',B.g],
    ['Printing paper','Ream|Box of 5 reams','Stationery','box','a4 paper|copy paper|typek|rotatrim',B.g],
    // Hardware & building
    ['Cement','50 kg|Per bag|Pallet','Hardware','sack','ppc|afrisam|lafarge|cement bag',B.h],
    ['Building sand','Per m³|Per bag|Per load','Hardware','sack','sand|plaster sand|river sand|stone|crusher stone|gravel',B.h],
    ['Bricks','Each|Per 1000|Per pallet','Hardware','brick','cement bricks|stock bricks|face bricks|blocks|paving bricks|maxi bricks',B.h],
    ['Roof sheets','2.4 m|3 m|3.6 m|4.8 m|Per m','Hardware','roof','corrugated iron|ibr sheets|zinc|roofing|roof sheet',B.h],
    ['Timber','38 × 38 mm|38 × 76 mm|50 × 76 mm|Per m','Hardware','plank','wood|planks|brandering|rafters|ceiling board|chipboard|plywood',B.h],
    ['Paint','1 L|5 L|20 L','Hardware','paint','pva|enamel|roof paint|wall paint|primer|undercoat|plascon|dulux',B.h],
    ['Nails','1 kg|5 kg|Box','Hardware','tool','wire nails|roofing nails|screws|wall plugs|bolts',B.h],
    ['Door','Each|813 × 2032 mm','Hardware','door','doors|hardwood door|hollow core door|door frame|steel door|window frame',B.h],
    ['Door lock','Each','Hardware','tool','lock set|padlock|cylinder lock|handles|hinges',B.h],
    ['PVC pipe','40 mm × 6 m|50 mm × 6 m|110 mm × 6 m','Hardware','pipe','pipes|conduit|elbow|fittings|plumbing pipe|geyser|tap|basin|toilet pan',B.h],
    ['Electrical cable','Per m|100 m roll','Hardware','tool','cable|wire|surfix|plugs|switch|light fitting|extension cord|db board',B.h],
    ['Tile adhesive','20 kg','Hardware','sack','tiles|ceramic tiles|floor tiles|grout|tile grout|tile cutter',B.h],
    ['Wheelbarrow','Each','Hardware','tool','spade|shovel|pick|rake|hoe|garden fork|garden hose',B.h],
    ['Cordless drill','Each|18 V','Hardware','drill','drill|angle grinder|grinder|jigsaw|power tools|drill bits',B.h],
    ['Hand tools','Each|Set','Hardware','hammer','hammer|spanner set|screwdriver|pliers|tape measure|spirit level|saw|trowel',B.h],
    ['Water tank','1 000 L|2 500 L|5 000 L','Hardware','tank','jojo tank|rain tank|water storage|borehole pump|pressure pump',B.h],
    ['Fencing','Per m|Roll|Each','Hardware','fence','fence|diamond mesh|barbed wire|fence poles|razor wire|gate|palisade',B.h],
    // Takeaway & restaurant
    ['Kota','Quarter|Half|Full','Takeaway','kota','sphatlo|bunny|spatlo|skhambane|kota special',B.f],
    ['Bunny chow','Quarter|Half|Full','Takeaway','kota','mutton bunny|chicken bunny|bean bunny',B.f],
    ['Quarter chicken & chips','Serves 1|With pap|With roll','Takeaway','plate','quarter chicken|half chicken|full chicken|grilled chicken|peri peri chicken|chicken and chips',B.f],
    ['Pap & wors','Serves 1|Serves 2','Takeaway','plate','pap and wors|pap en vleis|pap and chicken|pap and stew|shisanyama plate',B.f],
    ['Burger','Single|Double|With chips','Takeaway','burger','beef burger|chicken burger|cheese burger|hamburger',B.f],
    ['Chips (portion)','Small|Medium|Large|Family','Takeaway','fries','slap chips|hot chips|chips and russian|chips and vienna',B.f],
    ['Russian & chips','Serves 1','Takeaway','fries','russian and chips|vienna and chips|dunked wings',B.f],
    ['Hot wings','4 pack|6 pack|8 pack|12 pack','Takeaway','chicken','chicken wings|spicy wings|wings and chips|wings',B.f],
    ['Pizza','Small|Medium|Large','Takeaway','pizza','margherita|pepperoni|hawaiian|pizza slice',B.f],
    ['Pie','Each|With chips','Takeaway','pie','pies|steak pie|chicken pie|pepper steak pie|cornish pie|sausage roll',B.f],
    ['Braai plate','Serves 1|Serves 2|Serves 4','Takeaway','plate','shisanyama|braai pack|meat platter|mixed grill',B.f],
    ['Mogodu & dumpling','Serves 1','Takeaway','plate','mogodu|tripe and dumpling|dombolo|ujeqe|samp and beef',B.f],
    ['Breakfast','Serves 1','Takeaway','plate','full breakfast|english breakfast|eggs and toast|bacon and eggs',B.f],
    ['Wrap','Each','Takeaway','wrap','chicken wrap|shawarma|gatsby|sandwich|toasted sandwich|boerie roll|hot dog',B.f],
    ['Salad','Side|Large','Takeaway','leaf','greek salad|chicken salad|coleslaw|side salad',B.f],
    ['Milkshake','300 ml|500 ml','Takeaway','cup','shake|smoothie|iced coffee|cappuccino|coffee|tea cup|cold drink can',B.f],
    ['Fried fish & chips','Serves 1','Takeaway','fish','fish and chips|hake and chips|calamari and chips',B.f],
    ['Soup','Cup|Bowl','Takeaway','cup','soup of the day|bean soup|butternut soup',B.f],
    ['Dessert','Each|Slice','Takeaway','cake','malva pudding|ice cream cone|waffle|pancakes|koeksisters',B.f],
    // Beauty & salon
    ['Haircut','Men|Women|Kids','Hair','scissors','cut|fade|chiskop|brush cut|trim|clipper cut|line up',B.b],
    ['Braids','Box braids|Knotless|Cornrows|Twists|Faux locs','Hair','hair','braid|plaits|cornrow|singles|passion twists|goddess locs',B.b],
    ['Wash & blow','Short|Medium|Long','Hair','hairdryer','blow dry|wash and set|silk press|flat iron|treatment',B.b],
    ['Relaxer','Short|Medium|Long','Hair','bottle','retouch|chemical straightening|texturiser|colour|hair dye|highlights',B.b],
    ['Weave install','Sew-in|Closure|Frontal|Wig install','Hair','hair','weave|frontal install|closure install|wig styling|dreadlocks|locs retwist',B.b],
    ['Beard trim','Each|With hot towel','Hair','razor','beard|shave|beard shaping|hot towel shave',B.b],
    ['Manicure','Basic|Gel|Acrylic|Gel overlay','Nails','nails','nails|gel nails|acrylic nails|nail art|tips|french manicure',B.b],
    ['Pedicure','Basic|Gel|Spa','Nails','nails','feet|foot spa|gel toes',B.b],
    ['Eyelashes','Classic|Hybrid|Volume|Refill','Beauty','lashes','lashes|lash extensions|lash lift|strip lashes',B.b],
    ['Eyebrows','Shaping|Tint|Microblading|Threading','Beauty','lashes','brows|brow tint|brow lamination|wax',B.b],
    ['Facial','30 min|60 min','Beauty','lotion','deep cleanse facial|skin treatment|dermaplaning|peel',B.b],
    ['Massage','30 min|60 min|90 min','Beauty','hands','full body massage|back massage|hot stone|swedish massage',B.b],
    ['Makeup','Day|Evening|Bridal','Beauty','lipstick','make up|bridal makeup|glam|matric dance makeup',B.b],
    ['Waxing','Half leg|Full leg|Underarm|Bikini','Beauty','lotion','wax|hair removal|brazilian wax',B.b],
    // Fashion
    ['T-shirt','S–XL|XS–XXL|Each|2 pack','Clothing','shirt','tshirt|tee|golf shirt|vest|top|blouse',B.w],
    ['Jeans','28–40|S–XL|Each','Clothing','jeans','denim|skinny jeans|chinos|trousers|pants|tracksuit pants',B.w],
    ['Dress','S–L|XS–XL|Each','Clothing','dress','summer dress|maxi dress|skirt|two piece|church dress',B.w],
    ['Jacket','S–XL|Each','Clothing','jacket','hoodie|puffer jacket|coat|tracksuit|jersey|cardigan|blazer',B.w],
    ['Sneakers','Sizes 3–9|Sizes 6–12|Each','Shoes','shoe','takkies|tekkies|running shoes|trainers|sandals|heels|boots|slides',B.w],
    ['School shoes','Sizes 10–2|Sizes 3–8|Each','Shoes','shoe','school shoe|toughees|school uniform|school shirt|school socks',B.w],
    ['Underwear','3 pack|5 pack|Each','Clothing','shirt','socks|briefs|boxers|bra|panties|vests',B.w],
    ['Cap','Each','Accessories','cap','hat|beanie|bucket hat|doek|scarf',B.w],
    ['Handbag','Each','Accessories','bag-fashion','bag|sling bag|purse|wallet|belt|sunglasses|watch|earrings|jewellery',B.w],
    ['Blanket','Single|Double|Queen|King','Home','blanket','duvet|comforter|sheets|pillows|towels|curtains',B.w],
    // Services
    ['House cleaning','Per visit|Per hour|Deep clean','Cleaning','broom','cleaning|domestic cleaning|office cleaning|move-out clean|window cleaning',B.s],
    ['Carpet cleaning','Per room|Per m²','Cleaning','broom','couch cleaning|upholstery cleaning|mattress cleaning|car seat cleaning',B.s],
    ['Laundry','Per kg|Per load|Per item','Cleaning','basket','wash and fold|ironing|dry cleaning|wash dry fold|duvet wash',B.s],
    ['Plumbing','Call-out|Per hour|Quote','Repairs','pipe','plumber|burst pipe|geyser repair|blocked drain|leaking tap|toilet repair',B.s],
    ['Electrical work','Call-out|Per hour|Quote','Repairs','bulb','electrician|wiring|coc certificate|plug points|lights|prepaid meter',B.s],
    ['Appliance repair','Call-out|Quote','Repairs','tool','fridge repair|washing machine repair|stove repair|tv repair|microwave repair',B.s],
    ['Phone repair','Screen|Battery|Charging port|Quote','Repairs','phone','screen replacement|cellphone repair|laptop repair|software|unlock',B.s],
    ['Car wash','Basic|Wash & vac|Full valet|Engine wash','Vehicle','car','carwash|valet|polish|interior clean|wash and go',B.s],
    ['Tyre service','Puncture|Fitting|Balancing|Alignment','Vehicle','tyre','tyres|tyre repair|wheel alignment|wheel balancing|second hand tyres|brake pads|oil change|battery',B.s],
    ['Mechanic','Call-out|Per hour|Quote|Service','Vehicle','tool','car service|minor service|major service|clutch|diagnostics|panel beating|spray painting',B.s],
    ['Painting','Per m²|Per room|Quote','Building','paint','painter|house painting|roof painting|waterproofing',B.s],
    ['Tiling','Per m²|Quote','Building','brick','tiler|paving|plastering|bricklaying|building|renovations|ceilings|dry walling',B.s],
    ['Garden service','Per visit|Per month|Quote','Garden','leaf','lawn mowing|grass cutting|tree felling|landscaping|irrigation',B.s],
    ['Printing','Per page|Per 100|Colour|Black & white','Printing','printer','photocopy|copies|scan|lamination|binding|passport photos|cv typing|business cards|flyers|banners',B.s],
    ['Tailoring','Per item|Quote','Sewing','scissors','alterations|hemming|dressmaking|school uniform sewing|curtains made|zip replacement',B.s],
    ['DStv installation','Standard|Extra view|Relocation','Installation','tool','satellite dish|decoder|openview|tv mounting|cctv installation|alarm installation|wifi installation|solar installation|inverter',B.s],
    ['Transport','Local|Per km|Per load','Transport','car','bakkie hire|removals|furniture removal|delivery|rubble removal|school transport|shuttle',B.s],
    ['Tutoring','Per hour|Per month','Education','book','extra lessons|maths lessons|driving lessons|computer lessons|driving school',B.s],
    ['Events & catering','Per person|Per plate|Quote','Events','plate','catering|tent hire|chair hire|jumping castle|dj|photographer|cake orders|decor',B.s],
    ['Pest control','Per visit|Quote','Cleaning','spray','fumigation|cockroaches|rats|bed bugs|termites',B.s]
  ];
  const catalogue=rows.map(([name,sizes,section,icon,synonyms,business],i)=>({id:'p'+i,name,sizes:sizes.split('|'),section,icon,synonyms:synonyms?synonyms.split('|'):[],business}));
  const UNIT=/^(?:\d+(?:[.,]\d+)?)\s*(?:kg|g|ml|l|m|mm|cm|mb|gb|pack|pk|s|'s|x|×|tray|dozen|ream|roll|slab|box|bag|pocket|v)$/i;
  function normalise(text){return String(text||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ.,'’\s×x-]/g,' ').replace(/[’]/g,"'").replace(/\s+/g,' ').trim();}
  const tokens=text=>normalise(text).split(' ').filter(Boolean);
  // Damerau–Levenshtein with early exit; tolerant of one slip in short words and two in long ones.
  function distance(a,b,max){
    if(Math.abs(a.length-b.length)>max)return max+1;
    const rows=[];for(let i=0;i<=a.length;i++){rows[i]=[i];for(let j=1;j<=b.length;j++)rows[i][j]=i?0:j;}
    for(let i=1;i<=a.length;i++){let best=Infinity;for(let j=1;j<=b.length;j++){const cost=a[i-1]===b[j-1]?0:1;let v=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+cost);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,rows[i-2][j-2]+1);rows[i][j]=v;best=Math.min(best,v);}if(best>max)return max+1;}
    return rows[a.length][b.length];
  }
  // One slip is forgiven from four letters, two from eight. Short words must
  // also keep their first letter so "rice" never drifts to "ice".
  const fuzzyBudget=word=>word.length>=8?2:word.length>=4?1:0;
  function tokenScore(queryWord,word){
    if(word===queryWord)return 1;
    if(word.startsWith(queryWord))return .9-Math.min(.2,(word.length-queryWord.length)*.02);
    const budget=fuzzyBudget(queryWord);
    if(budget&&(queryWord.length>=6||word[0]===queryWord[0])&&word.length>=4&&distance(queryWord,word,budget)<=budget)return .6;
    if(queryWord.length>=4&&word.includes(queryWord))return .5;
    return 0;
  }
  // Pull a pack size and a price out of what was typed: "maize meal 12.5kg 119.99".
  function parseQuery(text){
    const words=tokens(text);let price='',size='';const keep=[],kept=[];
    for(let i=0;i<words.length;i++){
      const w=words[i],next=words[i+1]||'';
      const money=w.match(/^r?(\d+(?:[.,]\d{1,2})?)$/);
      if(/^r\d/.test(w)||(money&&i===words.length-1&&words.length>1&&/[.,]\d{2}$/.test(w))){price=money[1].replace(',','.');continue;}
      // Case packs: "6x1l", "12 x 1 L", "24 × 330ml".
      const casePack=w.match(/^(\d+)[x×](\d+(?:[.,]\d+)?)(kg|g|ml|l)$/);
      if(casePack){size=casePack[1]+' × '+casePack[2].replace(',','.')+' '+(casePack[3]==='l'?'L':casePack[3]);continue;}
      if(/^\d+$/.test(w)&&/^[x×]$/.test(next)){
        const a=words[i+2]||'',b=words[i+3]||'',joined=a.match(/^(\d+(?:[.,]\d+)?)(kg|g|ml|l)$/);
        if(joined){size=w+' × '+joined[1].replace(',','.')+' '+(joined[2]==='l'?'L':joined[2]);i+=2;continue;}
        if(/^\d+(?:[.,]\d+)?$/.test(a)&&/^(kg|g|ml|l)$/.test(b)){size=w+' × '+a.replace(',','.')+' '+(b==='l'?'L':b);i+=3;continue;}
      }
      if(/^\d+(?:[.,]\d+)?(?:kg|g|ml|l|mb|gb|s|pk|x|m|mm|cm|v)$/.test(w)){size=w.replace(/^(\d+(?:[.,]\d+)?)([a-z]+)$/,(m,n,u)=>n+' '+({kg:'kg',g:'g',ml:'ml',l:'L',mb:'MB',gb:'GB',s:'s',pk:'pack',x:'×',m:'m',mm:'mm',cm:'cm',v:'V'})[u]);continue;}
      if(/^\d+(?:[.,]\d+)?$/.test(w)&&UNIT.test(w+' '+next)&&!/^x$/.test(next)){size=w+' '+(({l:'L',pk:'pack',mb:'MB',gb:'GB',v:'V'})[next]||next);i++;continue;}
      if(/^(per|each|serves|size|whole|half|quarter)$/.test(w)){const rest=words.slice(i).join(' ');size=rest.charAt(0).toUpperCase()+rest.slice(1);break;}
      keep.push(w);kept.push(i);
    }
    // The name as the person typed it, with only the size and price removed.
    const raw=String(text||'').trim().split(/\s+/).filter(Boolean);
    const name=raw.length===words.length?kept.map(i=>raw[i]).join(' '):keep.join(' ');
    return {query:keep.join(' '),size,price,name:name.length?name.charAt(0).toUpperCase()+name.slice(1):''};
  }
  function matchSize(entry,size){
    if(!size)return '';
    return entry.sizes.find(s=>sameSize(s,size))||'';
  }
  // Rank catalogue entries and the person's own saved products for a query.
  // context: {business, section, saved:[{name,size,price,photo,...}], recent:[names]}
  function search(text,context={},limit=8){
    const parsed=parseQuery(text),words=tokens(parsed.query);
    if(!words.length||parsed.query.length<2)return {...parsed,results:[]};
    const recent=new Map((context.recent||[]).map((name,i)=>[normalise(name),i]));
    const savedByName=new Map();for(const product of context.saved||[]){const key=normalise(product.name);if(!savedByName.has(key))savedByName.set(key,[]);savedByName.get(key).push(product);}
    const scored=[];
    // Names, synonyms and the sizes themselves (“box braids”, “fade”) all count as ways to find an entry.
    const score=(name,synonyms,sizes=[])=>{
      const candidates=[[tokens(name),1,''],...synonyms.map(s=>[tokens(s),.9,'']),...sizes.map(s=>[tokens(name+' '+s),.85,s])];let best=0,exact=false,viaSize='';
      for(const [candidate,weight,size] of candidates){
        let total=0,ok=true;
        for(const word of words){let top=0;for(const cand of candidate)top=Math.max(top,tokenScore(word,cand));if(!top){ok=false;break;}total+=top;}
        if(!ok)continue;
        const joined=candidate.join(' '),value=total/words.length*weight+(joined===words.join(' ')?.3:joined.startsWith(words.join(' '))?.15:0);
        if(joined===words.join(' '))exact=true;if(value>best){best=value;viaSize=size;}
      }
      return {value:best,exact,viaSize};
    };
    const wanted=parsed.size&&parseSize(parsed.size);
    for(const entry of catalogue){
      const {value,exact,viaSize}=score(entry.name,entry.synonyms,entry.sizes);if(!value)continue;
      // Never offer a 5 kg pack to someone who asked for 10 kg. A product family
      // whose listed sizes do not include the typed size is offered only in the
      // typed size; entries without measurable sizes drop out.
      let customSize=false;
      if(wanted){
        if(!entry.sizes.some(s=>parseSize(s)))continue;
        if(!entry.sizes.some(s=>sameSize(s,parsed.size)))customSize=true;
      }
      let boost=customSize?-.2:0;
      if(context.business&&entry.business===context.business)boost+=.12;else if(context.business&&context.business!=='general'&&entry.business!=='grocery'&&entry.business!==context.business)boost-=.15;
      if(context.section&&normalise(entry.section)===normalise(context.section))boost+=.08;
      if(recent.has(normalise(entry.name)))boost+=.1-Math.min(.08,recent.get(normalise(entry.name))*.01);
      const own=savedByName.get(normalise(entry.name))||[];
      scored.push({kind:'catalogue',entry,score:value+boost+(own.length?.05:0),exact,size:matchSize(entry,parsed.size)||viaSize,saved:own,customSize});
    }
    for(const [key,products] of savedByName){
      if(catalogue.some(entry=>normalise(entry.name)===key))continue;
      const {value}=score(products[0].name,[]);if(!value)continue;
      scored.push({kind:'saved',entry:{id:'saved:'+key,name:products[0].name,sizes:[...new Set(products.map(p=>p.size).filter(Boolean))],section:products[0].section||'',icon:products[0].icon||'',synonyms:[],business:context.business||''},score:value+.2,exact:false,size:'',saved:products});
    }
    scored.sort((a,b)=>b.score-a.score||a.entry.name.localeCompare(b.entry.name));
    const results=scored.slice(0,limit).map(r=>({
      id:r.entry.id,name:r.entry.name,section:r.entry.section,icon:r.entry.icon,sizes:r.customSize?[parsed.size]:orderSizes(r.entry.sizes,r.saved,r.size),customSize:!!r.customSize,own:r.saved.map(p=>({size:p.size,price:p.price,photo:p.photo||'',id:p.id,source:p.source||null,icon:p.icon||''})),kind:r.kind,score:Math.round(r.score*100)/100
    }));
    return {...parsed,results,exact:results.length>0&&scored[0].exact};
  }
  // The person's own last sizes come first, then the typed size, then common sizes.
  function orderSizes(sizes,saved,typed){
    const seen=new Set(),out=[];const push=s=>{const key=normalise(s);if(s&&!seen.has(key)){seen.add(key);out.push(s);}};
    for(const product of saved)push(product.size);if(typed)push(typed);for(const s of sizes)push(s);
    return out.slice(0,8);
  }
  // Exact (or near-exact) catalogue match for a typed name, used to attach an
  // illustration and department to pasted lists without changing any text.
  function identify(name){
    const words=tokens(name);if(!words.length)return null;
    const key=words.join(' ');
    for(const entry of catalogue){const names=[entry.name,...entry.synonyms].map(normalise);if(names.includes(key))return entry;}
    for(const entry of catalogue){const names=[entry.name,...entry.synonyms].map(normalise);if(names.some(n=>n.length>=5&&(key.startsWith(n+' ')||key.endsWith(' '+n)||n===key.replace(/s$/,''))))return entry;}
    return null;
  }
  function enrich(item){
    if(!item||!item.name||item.icon||item.photo)return item;
    const entry=identify(item.name);if(!entry)return item;
    return {...item,icon:entry.icon,...(item.section||!entry.section?{}:{section:entry.section})};
  }
  // GTIN-8/12/13/14 check digit (mod 10, weights 3 and 1 from the right).
  function validBarcode(value){
    const code=String(value||'').replace(/\s+/g,'');
    if(!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))return false;
    const digits=code.split('').map(Number),check=digits.pop();
    const sum=digits.reverse().reduce((total,d,i)=>total+d*(i%2===0?3:1),0);
    return (10-sum%10)%10===check;
  }
  // Pack sizes compare by quantity and unit, so "10kg", "10 kg" and "10 KG" are
  // the same size and 5 kg never satisfies a request for 10 kg.
  const unitMap={kg:['kg',1000,'g'],g:['g',1,'g'],mg:['mg',.001,'g'],l:['L',1000,'ml'],ml:['ml',1,'ml'],cl:['cl',10,'ml'],m:['m',1000,'mm'],cm:['cm',10,'mm'],mm:['mm',1,'mm'],gb:['GB',1024,'MB'],mb:['MB',1,'MB']};
  function parseSize(text){
    const s=normalise(text).replace(/,/g,'.');
    const m=s.match(/^(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|g|mg|l|ml|cl|m|cm|mm|gb|mb)\b(.*)$/);
    if(!m)return null;
    const count=Number(m[1]||1),unit=unitMap[m[3]];
    return {count,amount:Number(m[2]),unit:unit[0],base:unit[2],baseAmount:Number(m[2])*unit[1],rest:m[4].trim()};
  }
  function sameSize(a,b){
    const x=parseSize(a),y=parseSize(b);
    if(x&&y)return x.count===y.count&&x.base===y.base&&Math.abs(x.baseAmount-y.baseAmount)<1e-6;
    return normalise(a).replace(/\s+/g,'')===normalise(b).replace(/\s+/g,'')&&!!normalise(a);
  }
  // Pull a pack size out of free text such as "Sunflower Oil 2L" (used when a
  // provider record has no quantity field); flagged so it is never mistaken for
  // a confirmed size.
  function sizeFromText(text){
    const m=String(text||'').match(/(\d+\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|cl|mg)\b/i);
    if(!m)return '';
    const unit=m[3].toLowerCase();return (m[1]?m[1].replace(/\s*[x×]\s*/,' × '):'')+m[2].replace(',','.')+' '+(unit==='l'?'L':unit);
  }
  const sections=[...new Set(catalogue.map(e=>e.section))];
  root.ShopDeskProducts={catalogue,sections,search,parseQuery,identify,enrich,normalise,distance,validBarcode,parseSize,sameSize,sizeFromText};
})(typeof window!=='undefined'?window:globalThis);
