export type Lang = "en" | "sq";

interface DictShape {
  nav: { home: string; browse: string; how: string; about: string; contact: string; shortlist: string };
  common: {
    search: string; talkToUs: string; findCar: string; learnMore: string;
    viewAll: string; from: string; allIn: string; backToTop: string;
    lightMode: string; darkMode: string; menu: string;
  };
  hero: { eyebrow: string; title: string; titleAccent: string; subtitle: string; trust: string[] };
  search: {
    title: string; brand: string; model: string; year: string; fuel: string;
    anyBrand: string; anyModel: string; anyFuel: string; yearFrom: string; yearTo: string;
    fuels: Record<string, string>; searchBtn: string; moreFilters: string;
  };
  how: { eyebrow: string; title: string; steps: { n: string; title: string; body: string }[] };
  why: { eyebrow: string; title: string; pillars: { title: string; body: string }[] };
  featured: { eyebrow: string; title: string; year: string; mileage: string; fuel: string; addShortlist: string; inShortlist: string };
  cost: {
    eyebrow: string; title: string; subtitle: string; carPriceLabel: string;
    lines: { car: string; shipping: string; customs: string; excise: string; vat: string; total: string };
    disclaimer: string;
  };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  cta: { title: string; subtitle: string };
  footer: {
    tagline: string; explore: string; exploreLinks: string[];
    company: string; companyLinks: string[];
    getInTouch: string; rights: string; privacy: string; terms: string; demo: string;
  };
  about: {
    eyebrow: string; title: string; lead: string;
    storyTitle: string; story: string[];
    whyTitle: string; why: string; whereTitle: string; where: string;
    dontTitle: string; dont: string[];
    credsTitle: string; creds: string[];
    teamCaption: string; officeCaption: string;
  };
  contact: {
    eyebrow: string; title: string; lead: string;
    name: string; email: string; phone: string; message: string;
    carId: string; carIdHint: string;
    namePh: string; emailPh: string; phonePh: string; messagePh: string;
    send: string; sending: string; success: string; another: string;
    officeTitle: string; officesTitle: string; hours: string;
    /** All offices/locations. The first one is treated as the primary (used in footer). */
    offices: { city: string; address: string }[];
    phoneVal: string; emailVal: string; whatsappVal: string; hoursVal: string;
    mapNote: string;
  };
}

export type Dict = DictShape;

export const DICT: Record<Lang, DictShape> = {
  en: {
    nav: { home: "Home", browse: "Browse cars", how: "How it works", about: "About", contact: "Contact", shortlist: "Shortlist" },
    common: {
      search: "Search", talkToUs: "Talk to us", findCar: "Find your car", learnMore: "Learn more",
      viewAll: "View all cars", from: "from", allIn: "all-in to Kosovo", backToTop: "Back to top",
      lightMode: "Light", darkMode: "Dark", menu: "Menu",
    },
    hero: {
      eyebrow: "Used cars from South Korea, imported to Kosovo",
      title: "From Korea to your driveway.",
      titleAccent: "Fully vetted, fully costed.",
      subtitle: "We find the car on Encar, verify it with KIDI accident history and a panel-by-panel dealer inspection, then deliver it to Kosovo with every euro of cost shown upfront.",
      trust: ["KIDI accident history", "Dealer inspection report", "All-in cost to Kosovo"],
    },
    search: {
      title: "Search live Korean listings",
      brand: "Brand", model: "Model", year: "Year", fuel: "Fuel",
      anyBrand: "Any brand", anyModel: "Any model", anyFuel: "Any fuel",
      yearFrom: "From", yearTo: "To",
      fuels: { petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", electric: "Electric", lpg: "LPG" } as Record<string, string>,
      searchBtn: "Search cars", moreFilters: "More filters",
    },
    how: {
      eyebrow: "How it works",
      title: "Three steps, nothing hidden in between.",
      steps: [
        { n: "01", title: "Search Encar, live", body: "Browse real-time listings from Korea's largest used-car marketplace, filtered for the Kosovo market." },
        { n: "02", title: "We verify everything", body: "Official KIDI accident history plus a panel-by-panel dealer inspection — reviewed with you before you commit." },
        { n: "03", title: "We ship & clear customs", body: "Korea → Durrës → Kosovo, with shipping, customs, VAT and excise handled and itemised in euros." },
      ],
    },
    why: {
      eyebrow: "Why us",
      title: "Built around due-diligence, not sales pressure.",
      pillars: [
        { title: "KIDI accident history", body: "We pull the official Korean Insurance Development Institute record for every car — repairs, total-loss flags and ownership changes." },
        { title: "Panel-by-panel inspection", body: "An independent dealer inspection with a visual damage diagram, so you see exactly which panels were ever touched." },
        { title: "Transparent total cost", body: "Listing, shipping, customs, VAT and excise — the full landed price in euros, before you decide anything." },
        { title: "No hidden fees, no upsell", body: "One flat, agreed service fee. We're never paid to push you toward a more expensive car." },
      ],
    },
    featured: {
      eyebrow: "Featured cars",
      title: "A sample of what's live right now.",
      year: "Year", mileage: "Mileage", fuel: "Fuel",
      addShortlist: "Add to shortlist", inShortlist: "In shortlist",
    },
    cost: {
      eyebrow: "Cost transparency",
      title: "What it really costs to land in Kosovo.",
      subtitle: "Move the slider to a car price and watch the full breakdown. Every line is itemised — no surprises at the port.",
      carPriceLabel: "Car price (Encar)",
      lines: {
        car: "Car price (Encar)",
        shipping: "Shipping · Korea → Durrës → Kosovo",
        customs: "Customs duty (10%)",
        excise: "Excise tax (est.)",
        vat: "VAT (18%)",
        total: "Total landed in Kosovo",
      },
      disclaimer: "Illustrative estimate. Excise depends on engine size, emissions and age; final duties are confirmed at customs clearance.",
    },
    faq: {
      eyebrow: "FAQ",
      title: "The questions everyone asks first.",
      items: [
        { q: "How long does the whole process take?", a: "Typically 6–9 weeks from agreement to your driveway: a few days to verify and purchase, around 4–6 weeks shipping Korea → Durrës, then customs clearance and transport to you in Kosovo." },
        { q: "What counts as an \"accident\" on the KIDI report?", a: "KIDI logs insurance-covered repairs. We separate minor panel work from structural damage and total-loss history, and explain what every entry means before you buy — a logged repair is not always a problem." },
        { q: "Is there any warranty?", a: "Korean used cars don't carry a manufacturer warranty abroad. We rely on the inspection report and KIDI history instead; an extended third-party warranty can be arranged on request." },
        { q: "How and when do I pay?", a: "A deposit secures the car at purchase; the balance plus itemised import costs is due before customs clearance. Everything is invoiced in euros, with no margin hidden in the exchange rate." },
        { q: "What if the car isn't as described?", a: "We verify before purchase precisely to avoid this. If verification turns up something material, we flag it and you can walk away — before any car is actually bought." },
      ],
    },
    cta: {
      title: "Find a car you can trust.",
      subtitle: "Search live listings, or tell us exactly what you're looking for.",
    },
    footer: {
      tagline: "Used cars from South Korea — verified, costed and imported to Kosovo.",
      explore: "Explore", exploreLinks: ["Browse cars", "How it works", "Cost calculator", "Shortlist"],
      company: "Company", companyLinks: ["About us", "Contact", "FAQ"],
      getInTouch: "Get in touch",
      rights: "© 2026 Korean Automotive Kosova. All rights reserved.",
      privacy: "Privacy", terms: "Terms",
      demo: "Contact details on this page are placeholders.",
    },
    about: {
      eyebrow: "About us",
      title: "We make buying a Korean car abroad feel safe.",
      lead: "Korean Automotive Kosova is a Kosovo-based importer that turns a distant online listing into a vetted car in your driveway — with the paperwork and the costs handled in the open.",
      storyTitle: "Our story",
      story: [
        "We started because importing a car from Korea looked impossibly opaque from Kosovo: listings in Korean, accident records you couldn't read, and \"all-in\" prices that quietly grew at every step.",
        "So we built the opposite. We work directly from Encar, pull the official KIDI accident history, commission an independent dealer inspection, and put every euro of landed cost on the table before anyone commits.",
      ],
      whyTitle: "Why Korean cars",
      why: "Korea has a young vehicle fleet, a strict roadworthiness and inspection culture, and a national accident database (KIDI). Together that means more honest histories and better-kept cars than most export markets can offer.",
      whereTitle: "Where we operate",
      where: "We're based in Kosovo and manage the full journey — from Korean dealer lots, through the port of Durrës, to your door.",
      dontTitle: "What we don't do",
      dont: [
        "We don't earn commission on the car price.",
        "We don't hide a margin in the exchange rate.",
        "We don't push you toward a more expensive car.",
        "We don't import a car we wouldn't buy ourselves.",
      ],
      credsTitle: "Credentials",
      creds: ["Registered Kosovo importer", "Direct Encar marketplace access", "KIDI accident-history reports", "Independent dealer inspections"],
      teamCaption: "Our team in Kosovo",
      officeCaption: "Our office",
    },
    contact: {
      eyebrow: "Contact",
      title: "Talk to us.",
      lead: "Questions about a specific car, or want us to find one for you? Send a message and we'll reply within one business day.",
      name: "Full name", email: "Email", phone: "Phone", message: "Message",
      carId: "Car reference (optional)", carIdHint: "e.g. a listing ID from Browse",
      namePh: "Your name", emailPh: "you@email.com", phonePh: "+383 …", messagePh: "Tell us what you're looking for…",
      send: "Send message", sending: "Sending…",
      success: "Thanks — we'll be in touch within one business day.",
      another: "Send another message",
      officeTitle: "Our office", officesTitle: "Our locations", hours: "Business hours",
      offices: [
        { city: "Mitrovicë (HQ)", address: "Rr. Bislim Bajgora, 40000 Mitrovica, Kosovo" },
        { city: "Gjakovë", address: "Rr. Wesley Clark (near B3 petrol station), Gjakovë, Kosovo" },
        { city: "Berlin", address: "Buckower Damm 110, Berlin, Germany" },
      ],
      phoneVal: "+383 49 120 275", emailVal: "hello@kakosova.com", whatsappVal: "+383 49 120 275",
      hoursVal: "Mon–Fri 09:00–18:00 · Sat 10:00–14:00",
      mapNote: "Map placeholder — embed Google Maps here",
    },
  },
  sq: {
    nav: { home: "Ballina", browse: "Veturat", how: "Si funksionon", about: "Rreth nesh", contact: "Kontakt", shortlist: "Lista" },
    common: {
      search: "Kërko", talkToUs: "Bisedo me ne", findCar: "Gjej veturën", learnMore: "Mëso më shumë",
      viewAll: "Shiko të gjitha veturat", from: "nga", allIn: "gjithëpërfshirëse deri në Kosovë", backToTop: "Kthehu lart",
      lightMode: "E çelët", darkMode: "E errët", menu: "Menyja",
    },
    hero: {
      eyebrow: "Vetura të përdorura nga Koreja e Jugut, të importuara në Kosovë",
      title: "Nga Koreja te oborri yt.",
      titleAccent: "Plotësisht e verifikuar, e kalkuluar.",
      subtitle: "Ne e gjejmë veturën në Encar, e verifikojmë me historikun e aksidenteve KIDI dhe një inspektim panel-për-panel nga dileri, pastaj e sjellim në Kosovë me çdo euro të kostos të treguar paraprakisht.",
      trust: ["Historiku i aksidenteve KIDI", "Raporti i inspektimit", "Kosto e plotë deri në Kosovë"],
    },
    search: {
      title: "Kërko shpallje koreane në kohë reale",
      brand: "Marka", model: "Modeli", year: "Viti", fuel: "Karburanti",
      anyBrand: "Çdo markë", anyModel: "Çdo model", anyFuel: "Çdo karburant",
      yearFrom: "Nga", yearTo: "Deri",
      fuels: { petrol: "Benzinë", diesel: "Dizel", hybrid: "Hibrid", electric: "Elektrik", lpg: "Gaz (LPG)" } as Record<string, string>,
      searchBtn: "Kërko veturat", moreFilters: "Më shumë filtra",
    },
    how: {
      eyebrow: "Si funksionon",
      title: "Tre hapa, asgjë e fshehur ndërmjet tyre.",
      steps: [
        { n: "01", title: "Kërko në Encar, live", body: "Shfleto shpalljet në kohë reale nga tregu më i madh i veturave të përdorura në Kore, të filtruara për tregun e Kosovës." },
        { n: "02", title: "Ne verifikojmë gjithçka", body: "Historiku zyrtar i aksidenteve KIDI plus një inspektim panel-për-panel nga dileri — i shqyrtuar bashkë me ty para se të vendosësh." },
        { n: "03", title: "Ne dërgojmë dhe zhdoganojmë", body: "Kore → Durrës → Kosovë, me transport, doganë, TVSH dhe akcizë të menaxhuara dhe të detajuara në euro." },
      ],
    },
    why: {
      eyebrow: "Pse ne",
      title: "Ndërtuar mbi verifikim, jo mbi presion shitjeje.",
      pillars: [
        { title: "Historiku i aksidenteve KIDI", body: "Ne marrim regjistrin zyrtar të Institutit Korean të Sigurimeve (KIDI) për çdo veturë — riparimet, humbjet totale dhe ndryshimet e pronësisë." },
        { title: "Inspektim panel-për-panel", body: "Inspektim i pavarur nga dileri me një diagram vizual të dëmeve, që ta shohësh saktësisht cilat panele janë prekur ndonjëherë." },
        { title: "Kosto totale transparente", body: "Shpallja, transporti, dogana, TVSH dhe akciza — çmimi i plotë në euro, para se të vendosësh asgjë." },
        { title: "Pa tarifa të fshehura, pa shitje shtesë", body: "Një tarifë shërbimi fikse dhe e dakorduar. Ne kurrë nuk paguhemi për të të shtyrë drejt një veture më të shtrenjtë." },
      ],
    },
    featured: {
      eyebrow: "Vetura të zgjedhura",
      title: "Një mostër nga ato që janë live tani.",
      year: "Viti", mileage: "Kilometrazhi", fuel: "Karburanti",
      addShortlist: "Shto në listë", inShortlist: "Në listë",
    },
    cost: {
      eyebrow: "Transparenca e kostos",
      title: "Sa kushton realisht të arrijë në Kosovë.",
      subtitle: "Lëviz rrëshqitësin te një çmim veture dhe shiko ndarjen e plotë. Çdo zë është i detajuar — pa surpriza në port.",
      carPriceLabel: "Çmimi i veturës (Encar)",
      lines: {
        car: "Çmimi i veturës (Encar)",
        shipping: "Transporti · Kore → Durrës → Kosovë",
        customs: "Dogana (10%)",
        excise: "Akciza (vlerësim)",
        vat: "TVSH (18%)",
        total: "Totali deri në Kosovë",
      },
      disclaimer: "Vlerësim ilustrues. Akciza varet nga kapaciteti i motorit, emetimet dhe mosha; detyrimet përfundimtare konfirmohen gjatë zhdoganimit.",
    },
    faq: {
      eyebrow: "Pyetjet",
      title: "Pyetjet që i bën gjithkush i pari.",
      items: [
        { q: "Sa zgjat i gjithë procesi?", a: "Zakonisht 6–9 javë nga marrëveshja deri te oborri yt: disa ditë për verifikim dhe blerje, rreth 4–6 javë transport Kore → Durrës, pastaj zhdoganim dhe transport te ti në Kosovë." },
        { q: "Çfarë konsiderohet \"aksident\" në raportin KIDI?", a: "KIDI regjistron riparimet e mbuluara nga sigurimi. Ne i ndajmë punët e vogla në panele nga dëmet strukturore dhe historiku i humbjes totale, dhe shpjegojmë çdo zë para blerjes — një riparim i regjistruar nuk është gjithmonë problem." },
        { q: "A ka garanci?", a: "Veturat e përdorura koreane nuk kanë garanci nga prodhuesi jashtë vendit. Ne mbështetemi te raporti i inspektimit dhe historiku KIDI; një garanci e zgjatur nga palë e tretë mund të organizohet me kërkesë." },
        { q: "Si dhe kur paguaj?", a: "Një paradhënie e siguron veturën gjatë blerjes; pjesa e mbetur plus kostot e importit të detajuara paguhen para zhdoganimit. Gjithçka faturohet në euro, pa marzh të fshehur në kursin e këmbimit." },
        { q: "Po nëse vetura nuk është siç përshkruhet?", a: "Ne verifikojmë para blerjes pikërisht për ta shmangur këtë. Nëse verifikimi nxjerr diçka të rëndësishme, ne e theksojmë dhe ti mund të tërhiqesh — para se të blihet faktikisht ndonjë veturë." },
      ],
    },
    cta: {
      title: "Gjej një veturë që mund t'i besosh.",
      subtitle: "Kërko shpalljet live, ose na trego saktësisht çfarë po kërkon.",
    },
    footer: {
      tagline: "Vetura të përdorura nga Koreja e Jugut — të verifikuara, të kalkuluara dhe të importuara në Kosovë.",
      explore: "Eksploro", exploreLinks: ["Shfleto veturat", "Si funksionon", "Kalkulatori i kostos", "Lista"],
      company: "Kompania", companyLinks: ["Rreth nesh", "Kontakt", "Pyetjet"],
      getInTouch: "Na kontakto",
      rights: "© 2026 Korean Automotive Kosova. Të gjitha të drejtat e rezervuara.",
      privacy: "Privatësia", terms: "Kushtet",
      demo: "Të dhënat e kontaktit në këtë faqe janë vendmbajtëse.",
    },
    about: {
      eyebrow: "Rreth nesh",
      title: "E bëjmë blerjen e një veture koreane jashtë vendit të ndihet e sigurt.",
      lead: "Korean Automotive Kosova është një importues me bazë në Kosovë që e shndërron një shpallje të largët online në një veturë të verifikuar te oborri yt — me dokumentet dhe kostot të trajtuara hapur.",
      storyTitle: "Historia jonë",
      story: [
        "Filluam sepse importimi i një veture nga Koreja dukej tejet i errët nga Kosova: shpallje në gjuhën koreane, regjistra aksidentesh që nuk i lexoje dot, dhe çmime \"gjithëpërfshirëse\" që rriteshin në heshtje në çdo hap.",
        "Prandaj ndërtuam të kundërtën. Punojmë drejtpërdrejt nga Encar, marrim historikun zyrtar të aksidenteve KIDI, porosisim një inspektim të pavarur nga dileri, dhe vendosim çdo euro të kostos në tryezë para se dikush të zotohet.",
      ],
      whyTitle: "Pse vetura koreane",
      why: "Koreja ka një flotë të re automjetesh, një kulturë të rreptë inspektimi e gatishmërie teknike, dhe një bazë kombëtare të dhënash për aksidentet (KIDI). Së bashku kjo do të thotë histori më të ndershme dhe vetura më të mirëmbajtura sesa shumica e tregjeve të eksportit.",
      whereTitle: "Ku operojmë",
      where: "Jemi me bazë në Kosovë dhe menaxhojmë të gjithë udhëtimin — nga parkingjet e dilerëve koreanë, përmes portit të Durrësit, deri te dera jote.",
      dontTitle: "Çfarë nuk bëjmë",
      dont: [
        "Nuk fitojmë komision mbi çmimin e veturës.",
        "Nuk fshehim marzh në kursin e këmbimit.",
        "Nuk të shtyjmë drejt një veture më të shtrenjtë.",
        "Nuk importojmë një veturë që nuk do ta blinim vetë.",
      ],
      credsTitle: "Kredencialet",
      creds: ["Importues i regjistruar në Kosovë", "Qasje e drejtpërdrejtë në tregun Encar", "Raporte të historikut KIDI", "Inspektime të pavarura nga dileri"],
      teamCaption: "Ekipi ynë në Kosovë",
      officeCaption: "Zyra jonë",
    },
    contact: {
      eyebrow: "Kontakt",
      title: "Bisedo me ne.",
      lead: "Pyetje për një veturë specifike, ose dëshiron ta gjejmë një për ty? Dërgo një mesazh dhe do të përgjigjemi brenda një dite pune.",
      name: "Emri i plotë", email: "Email", phone: "Telefoni", message: "Mesazhi",
      carId: "Referenca e veturës (opsionale)", carIdHint: "p.sh. një ID shpalljeje nga Veturat",
      namePh: "Emri yt", emailPh: "ti@email.com", phonePh: "+383 …", messagePh: "Na trego çfarë po kërkon…",
      send: "Dërgo mesazhin", sending: "Duke dërguar…",
      success: "Faleminderit — do të kontaktojmë brenda një dite pune.",
      another: "Dërgo një mesazh tjetër",
      officeTitle: "Zyra jonë", officesTitle: "Lokacionet tona", hours: "Orari",
      offices: [
        { city: "Mitrovicë (Selia)", address: "Rr. Bislim Bajgora, 40000 Mitrovicë, Kosovë" },
        { city: "Gjakovë", address: "Rr. Wesley Clark (afër pompës B3), Gjakovë, Kosovë" },
        { city: "Berlin", address: "Buckower Damm 110, Berlin, Gjermani" },
      ],
      phoneVal: "+383 49 120 275", emailVal: "hello@kakosova.com", whatsappVal: "+383 49 120 275",
      hoursVal: "Hën–Pre 09:00–18:00 · Sht 10:00–14:00",
      mapNote: "Vendmbajtëse harte — vendos Google Maps këtu",
    },
  },
};
