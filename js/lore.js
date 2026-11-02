// Background lore for the starting nations: capital, founding, motto, a longer backstory
// and the key events of the years before the game starts (shown in each nation's history).
(function () {
  var G = window.G = window.G || {};
  G.lore = {
    USA: {
      capital: 'Washington, D.C.', founded: 1776, motto: 'E pluribus unum',
      story: 'The oldest of the great powers came out of the Long War bloodied but intact. Its coastal cities were spared the worst, but the war cost it the Pacific Northwest, three hundred thousand soldiers and its unquestioned leadership. What it kept was a head start in space: the Artemis Colony on the Moon is still the largest settlement off Earth, and Washington intends to keep it that way.',
      past: [[2061, 'First crewed lunar base completed'], [2062, 'Drawn into the Long War'], [2065, 'Founded Artemis Colony, the first permanent settlement on the Moon'], [2068, 'Lost the Pacific Northwest when Cascadia seceded'], [2074, 'Pacific Fleet crippled in the Battle of the Marianas'], [2077, 'Signed the Geneva Armistice']]
    },
    EF: {
      capital: 'Brussels', founded: 2064, motto: 'United in diversity, unbroken in fire',
      story: 'When the old European Union stalled in the first years of the war, its members chose to merge rather than fall one by one. The Treaty of Lyon created a federal government with a single army and treasury. It held the eastern front for thirteen years. Today the Federation is rich, cautious and bureaucratic, and its people want one thing above all: never again.',
      past: [[2062, 'European Union mobilises as the Long War begins'], [2064, 'Treaty of Lyon creates the European Federation'], [2069, 'Held the eastern front at the Second Battle of the Vistula'], [2071, 'Denmark, Sweden, Norway and Finland left the Federation'], [2077, 'Signed the Geneva Armistice']]
    },
    RUS: {
      capital: 'Moscow', founded: 1991, motto: 'Strength in unity',
      story: 'Russia went into the Long War expecting a short one. Fifteen years later it had lost Siberia to a military revolt, a third of its economy and millions of its people. It kept its nuclear arsenal and its pride. The Kremlin still talks of the lost lands as temporarily occupied, and it has not given up its claim to a piece of the Moon.',
      past: [[2062, 'Opened the eastern European front of the Long War'], [2066, 'Siege of Narva'], [2070, 'Siberian garrisons mutinied and declared independence'], [2075, 'Lost the Arctic ports to Federation air strikes'], [2077, 'Signed the Geneva Armistice under protest']]
    },
    CHN: {
      capital: 'Beijing', founded: 1949, motto: 'Common prosperity',
      story: 'China fought the Long War mostly at sea and in orbit, and it came out with the largest economy on Earth. The Party credits its survival to discipline and planning. Its outpost at Shackleton Crater on the lunar south pole holds the Moon\'s richest ice deposits. Beijing intends to win the next race without firing a shot.',
      past: [[2062, 'Entered the Long War in the western Pacific'], [2067, 'Launched the Tiangong Ring orbital station'], [2072, 'Established Shackleton Outpost at the lunar south pole'], [2074, 'Won the Battle of the Marianas'], [2077, 'Signed the Geneva Armistice']]
    },
    IND: {
      capital: 'New Delhi', founded: 1947, motto: 'Truth alone triumphs',
      story: 'India stayed out of the war longer than anyone, then fought along its northern borders. It lost fewer people than any other great power and has grown into the most populous nation in history. A billion young people want jobs, power and stars, and the space agency has promised humans on Mars before 2090.',
      past: [[2065, 'Joined the Long War after border clashes in the Himalaya'], [2069, 'Defended the Siliguri Corridor'], [2073, 'Opened the Sriharikota heavy-lift spaceport'], [2077, 'Signed the Geneva Armistice']]
    },
    PAC: {
      capital: 'Tokyo–Seoul', founded: 2066, motto: 'Harmony through reason',
      story: 'After the Korean peninsula reunified in the chaos of the war, Seoul and Tokyo merged their crippled governments into one Accord. Day-to-day governance was handed to an algorithmic administration overseen by a council of experts. It works unnervingly well. The Pacific Accord is the most technologically advanced nation on Earth, and it is surrounded by giants.',
      past: [[2063, 'Korean peninsula reunified'], [2066, 'Japan and Korea formed the Pacific Accord'], [2068, 'Handed governance to the Concord algorithmic administration'], [2074, 'Lost its southern fleet at the Marianas'], [2077, 'Signed the Geneva Armistice']]
    },
    PAU: {
      capital: 'Addis Ababa', founded: 2067, motto: 'One continent, one destiny',
      story: 'Africa was largely spared the bombs. As the old powers burned, the African Union became a true federation with a common currency and a parliament in Addis Ababa. It is young, enormous and rich in everything the world needs to rebuild. Its institutions are still fragile, and many of its member states have not forgotten old quarrels.',
      past: [[2062, 'Declared neutrality as the Long War began'], [2067, 'The African Union became the Pan-African Union'], [2071, 'Introduced the afro as a common currency'], [2076, 'Hosted the Nairobi peace talks']]
    },
    SAC: {
      capital: 'Brasília', founded: 2069, motto: 'Order, progress and green',
      story: 'The South American Compact began as an emergency food and energy pact and grew into a continental union led from Brasília. While the north burned, the south replanted: the Amazon Restoration Project is the largest ecological effort in history. It has given the Compact a moral authority that none of the war\'s survivors can match.',
      past: [[2063, 'Emergency Food Pact signed in Montevideo'], [2069, 'Founded the South American Compact'], [2072, 'Launched the Amazon Restoration Project'], [2077, 'Mediated the Geneva Armistice']]
    },
    TUR: {
      capital: 'Istanbul', founded: 2068, motto: 'From the Bosphorus to the Altai',
      story: 'Born in the chaos at the crossroads of the world, the Turkic Union stretches from Istanbul to Almaty. Its Khagan rules an ambitious, fast-growing state that sits on every trade route between Europe and Asia. Its neighbours fear its hunger for more.',
      past: [[2064, 'Türkiye and the Central Asian republics formed a defence pact'], [2068, 'Proclaimed the Turkic Union and its first Khagan'], [2073, 'Seized the Caspian oil fields'], [2077, 'Signed the Geneva Armistice']]
    },
    GULF: {
      capital: 'Riyadh', founded: 2066, motto: 'The sun rises for all',
      story: 'When oil died, the Gulf monarchies pooled their sovereign wealth funds and survived. The Concordat now builds solar farms the size of countries and exports power by cable to three continents. It buys friends, ports and influence wherever it can.',
      past: [[2062, 'Oil prices collapsed for the last time'], [2066, 'Gulf monarchies formed the Concordat'], [2070, 'Opened the Rub al Khali Solar Array'], [2075, 'Began exporting power to India by undersea cable']]
    },
    MESO: {
      capital: 'Mexico City', founded: 2070, motto: 'Together or not at all',
      story: 'Mexico and the nations of Central America united out of sheer necessity, as refugees, cartels and collapsing supply lines threatened to drown them one by one. The League is caught between the Americans in the north and the Compact in the south, and it is courted by both.',
      past: [[2064, 'Northern refugee crisis'], [2070, 'Treaty of Tegucigalpa founded the Mesoamerican League'], [2074, 'Broke the cartels in the Yucatán campaign']]
    },
    AUS: {
      capital: 'Perth', founded: 2069, motto: 'Ad astra per aspera',
      story: 'When Canberra fell silent after the Sydney strike, the mining conglomerates restored order and never gave it back. The Austral Directorate is run like a company, efficiently and without sentiment. Its Woomera spaceport is the busiest in the southern hemisphere.',
      past: [[2066, 'Sydney struck in the Long War; the federal government collapsed'], [2069, 'Mining houses formed the Austral Directorate'], [2073, 'Reopened Woomera as a commercial spaceport']]
    },
    CAS: {
      capital: 'Seattle', founded: 2068, motto: 'Rooted in the green, reaching for the sky',
      story: 'The Pacific Northwest had always felt different. When Washington ordered conscription and martial law in 2068, Seattle, Portland and Vancouver refused, and the Republic of Cascadia was born. It is a tech haven of labs, server farms and forests, and it lives in the long shadow of its former master to the south.',
      past: [[2068, 'Seceded from the United States and Canada'], [2069, 'Survived the Columbia River blockade'], [2072, 'Recognised by the European Federation']]
    },
    SIB: {
      capital: 'Novosibirsk', founded: 2070, motto: 'Our land, our rule',
      story: 'The Siberian garrisons had not been paid in two years when they turned on Moscow in 2070. The generals who lead the Free Republic still rule from the barracks, but they sit on the richest untouched resources left on Earth. Everyone wants Siberia, and its rulers know it.',
      past: [[2070, 'Garrison mutiny; Siberia declared independence from Moscow'], [2071, 'China recognised the Free Republic'], [2074, 'Repelled a Russian counter-offensive at Omsk']]
    },
    NRD: {
      capital: 'Copenhagen', founded: 2071, motto: 'Five crosses, one north',
      story: 'The Nordic states joined the European Federation at its founding, but the war turned the Arctic into a front line. Brussels wanted conscription quotas and Arctic bases on Nordic soil. In 2071 Denmark, Sweden, Norway and Finland walked out together and signed the Treaty of Kalmar, reviving an old dream of a union of the North. They share a parliament in Copenhagen, an army and the world\'s richest sovereign fund. They are small, wealthy, highly educated and stubbornly independent, and they insist that twenty million people can still lead the world.',
      past: [[2062, 'Denmark, Sweden, Norway and Finland entered the Long War as EU members'], [2064, 'The four Nordic states became founding members of the European Federation'], [2066, 'Finnish troops held the front against Russia at Lappeenranta'], [2071, 'Left the European Federation; the Treaty of Kalmar founded the Nordic Confederation'], [2073, 'Norwegian sovereign fund merged into the Nordic Fund'], [2075, 'Opened the Andøya and Kiruna launch sites']]
    },
    SGP: {
      capital: 'Singapore', founded: 1965, motto: 'Onward, neutral, open',
      story: 'Singapore declared strict neutrality at the start of the war and became the place where enemies met, traded and banked. Its board of directors runs the city like a holding company. It is tiny and unimaginably rich, and it would be almost impossible to defend.',
      past: [[2062, 'Declared strict neutrality'], [2067, 'Became a corporate free city'], [2076, 'Hosted secret armistice talks']]
    }
  };
})();
