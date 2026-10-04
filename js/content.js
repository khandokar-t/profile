/*
  All site content lives here. Every page reads from this one file,
  so the intersection, the tour, the map and the CV never disagree.

  To add your profile links later, paste the full URL between the quotes,
  e.g.  github: "https://github.com/your-name",
  An empty string shows a "coming soon" note instead of a broken link.
*/
window.SITE = {
  person: {
    name: "Khandokar Tanvir Rahman",
    short: "K. T. Rahman",
    first: "Tanvir",
    title: "Transportation Engineer",
    role: "Graduate Assistant, Intelligent Transportation Systems Lab, Western Michigan University",
    tagline: "Signals, safety and the data in between.",
    location: "Kalamazoo, Michigan",
    email: "khandokartanvir.rahman@wmich.edu"
  },

  links: {
    github: "",
    scholar: "",
    researchgate: "",
    orcid: "",
    linkedin: ""
  },

  linkLabels: {
    github: "GitHub",
    scholar: "Google Scholar",
    researchgate: "ResearchGate",
    orcid: "ORCID",
    linkedin: "LinkedIn"
  },

  interests: [
    "Intelligent Transportation Systems (ITS)",
    "Transportation safety",
    "Connected and automated vehicles",
    "Traffic operations",
    "Work-zone analysis",
    "Transportation planning",
    "Traffic flow modeling and simulation"
  ],

  /* Phase number -> section. Through phases (2, 4, 6, 8) are the four roads.
     Left-turn phases (1, 3, 5, 7) are the smaller sections. */
  phases: {
    1: { key: "skills",     label: "Skills",     street: "Projects Ave", turn: "left" },
    2: { key: "research",   label: "Research",   street: "Research Rd",  turn: "through" },
    3: { key: "awards",     label: "Awards",     street: "About Blvd",   turn: "left" },
    4: { key: "teaching",   label: "Teaching",   street: "Teaching St",  turn: "through" },
    5: { key: "papers",     label: "Papers",     street: "Research Rd",  turn: "left" },
    6: { key: "projects",   label: "Projects",   street: "Projects Ave", turn: "through" },
    7: { key: "leadership", label: "Leadership", street: "Teaching St",  turn: "left" },
    8: { key: "about",      label: "About",      street: "About Blvd",   turn: "through" }
  },

  sections: {
    about: {
      title: "From Dhaka's rivers to Michigan's roads",
      lead: "I am a transportation engineering graduate student at Western Michigan University. I work on traffic operations and safety, and on the data behind them: work zones, crash trends, signals and transit.",
      items: [
        {
          title: "M.S. Civil Engineering (Transportation)",
          meta: "Western Michigan University · Aug 2025 – Present · GPA 3.88 / 4.00",
          text: "Coursework: Transportation Planning, Travel Demand Analysis, Traffic Safety Engineering, Construction Project Delivery Systems, Civil Systems Analysis, Modeling and Analysis of Civil Engineering Applications."
        },
        {
          title: "B.Sc. Civil Engineering (Transportation)",
          meta: "Bangladesh University of Engineering and Technology (BUET) · May 2023 · GPA 3.49 / 4.00",
          text: "Thesis: A Study on Waterbus Service to Analyze User Preferences and Implement Solutions."
        },
        {
          title: "Research interests",
          tags: ["ITS", "Transportation safety", "Connected and automated vehicles", "Traffic operations", "Work zones", "Planning", "Traffic simulation"]
        }
      ],
      cta: { label: "Take the guided tour", href: "tour.html" }
    },

    research: {
      title: "Work-zone user delay and cost",
      lead: "Graduate Research Assistant, Intelligent Transportation System Lab, Western Michigan University.",
      items: [
        {
          title: "Evaluation of MDOT's methodology for estimating work-zone user delay times and costs",
          meta: "Aug 2025 – Present · Sponsor: Michigan Department of Transportation",
          bullets: [
            "Analyzed multi-source work-zone traffic data from RITIS, Bluetooth, API feeds, Microwave Vehicle Detection Systems (MVDS) and camera video: speed, volume, travel time, lane closures and work-zone layouts.",
            "Cleaned, processed, visualized and compared the sources to judge how well each suits work-zone delay and queue evaluation.",
            "Reviewed vehicle operating cost (VOC) methods for transparency, current validity, ease of use and fit with available inputs. The findings supported treating VOC as reviewed but non-monetized when roadway-condition inputs are insufficient."
          ],
          tags: ["RITIS", "Bluetooth", "MVDS", "Video data", "Python"]
        },
        {
          title: "Undergraduate research, BUET",
          meta: "2022 – 2023",
          bullets: [
            "Waterbus service and passenger preferences: designed and ran a questionnaire survey on passenger preferences, service barriers and user-centred factors in Dhaka's waterbus system, and turned the findings into operating recommendations.",
            "Unauthorized vehicle-related crash forecasting: analyzed police-recorded crash data (2009–2015) and used ARIMA time-series models to forecast crashes for 2016–2020, with collision and severity patterns for safety planning."
          ]
        }
      ]
    },

    papers: {
      title: "Two peer-reviewed conference papers",
      lead: "Both papers come from undergraduate research at BUET.",
      items: [
        {
          title: "A Study on Waterbus Services Using Passenger Preferences Data and the Way Forward",
          meta: "Rahman, K. T., Shristi, N. T., Shahriar, S. M. F., & Rahman, M. M. · 7th International Conference on Civil Engineering for Sustainable Development (ICCESD 2024) · March 2024",
          text: "Why Dhaka's first waterbus failed within 18 months, and what would make the next one work: more seats, reliable frequency, a hybrid electric water taxi and better passenger information.",
          links: [{ label: "Read on ResearchGate", href: "https://www.researchgate.net/publication/379118004" }]
        },
        {
          title: "Time Series Forecasting the Unauthorized Vehicle-Related Crashes in Bangladesh",
          meta: "Huq, A. S., Rahman, K. T., & Shristi, N. T. · 6th International Conference on Advances in Civil Engineering (ICACE 2022), CUET · December 2022",
          text: "Forecasting crashes that involve unregistered local vehicles such as easy-bikes and nosimons, using police crash records from 2009 to 2015 and an ARIMA(6,1,7) model.",
          links: [{ label: "Read on ResearchGate", href: "https://www.researchgate.net/publication/368713906" }]
        }
      ]
    },

    projects: {
      title: "Design, capstone and industry projects",
      lead: "From a high-crash roundabout in Michigan to a river channel in Dhaka.",
      items: [
        {
          title: "Turbo roundabout for a high-crash two-lane roundabout",
          meta: "Winner, Design Competition · ITE Great Lakes District Student Leadership Summit, Detroit, MI · 2026",
          bullets: [
            "Evaluated crash history, traffic demand, pedestrian conditions and operational alternatives.",
            "Proposed a turbo (spiral) roundabout to cut lane-changing conflicts in the circulating lanes and improve lane discipline.",
            "Covered pedestrians, signing and marking, safety and lifecycle cost, with a 20-year benefit–cost analysis: B/C = 1.12."
          ],
          tags: ["Roundabouts", "Safety", "Benefit–cost"]
        },
        {
          title: "Channel restoration of the Buriganga River and integrated roadway–waterway development, Kamrangirchar",
          meta: "Undergraduate capstone · BUET · 2023",
          bullets: [
            "Integrated concept: channel restoration and dredging, roadway improvements, bridge and jetty facilities, pedestrian walkways and riverbank protection.",
            "Evaluated how the improvements would raise connectivity, navigation, roadway capacity and multimodal access."
          ],
          tags: ["Waterways", "Planning", "AutoCAD"]
        },
        {
          title: "CLIMAS: climate change citizens engagement toolbox",
          meta: "Assistant Engineer · Indetechs Software Limited, Dhaka · Apr 2024 – Aug 2025",
          bullets: [
            "Helped build a Knowledge and Evidence-Based Support (KEBS) tool for setting climate-assembly agendas.",
            "Used Python, machine learning and natural language processing to organize and analyze decision-support information.",
            "Developed and organized ontologies that structure the knowledge and evidence in the system."
          ],
          tags: ["Python", "NLP", "Ontologies"]
        }
      ]
    },

    teaching: {
      title: "Seven courses at two universities",
      lead: "Labs and lectures, from traffic design to hydrology.",
      items: [
        {
          title: "Graduate Teaching Assistant",
          meta: "Western Michigan University · Aug 2025 – Present",
          bullets: ["CCE 4300 – Traffic Design", "CCE 3300 – Transportation Engineering"]
        },
        {
          title: "Adjunct Lecturer",
          meta: "Presidency University, Dhaka · Spring and Summer 2025",
          bullets: [
            "Transportation Engineering Sessional I",
            "Computer Programming Sessional",
            "Environmental Engineering Sessional I",
            "Environmental Engineering II",
            "Hydrology and Irrigation Engineering"
          ]
        }
      ]
    },

    skills: {
      title: "Toolbox",
      lead: "The software and data I work with.",
      items: [
        { title: "Modeling and simulation", tags: ["PTV Vissim", "PTV Visum", "PTV Vistro", "HCS", "HSS"] },
        { title: "Programming and data analysis", tags: ["Python", "C++", "MATLAB", "StataSE", "Microsoft Excel"] },
        { title: "Transportation data", tags: ["RITIS", "Bluetooth traffic data", "API-based traffic data", "MVDS data", "Video-based traffic data"] },
        { title: "GIS and engineering software", tags: ["ArcGIS Pro", "AutoCAD", "ETABS", "SAP", "Protégé"] }
      ]
    },

    awards: {
      title: "Wins and recognition",
      lead: "Competitions and scholarships.",
      items: [
        { title: "Winner, Design Competition", meta: "ITE Great Lakes District Student Leadership Summit, Detroit, MI · 2026" },
        { title: "Finalist, Traffic Bowl", meta: "ITE Great Lakes District Student Leadership Summit · 2026" },
        { title: "First Runner-Up, Mechanics Maestro", meta: "Eccentric Civil Engineering Festival, BUET · 2018" },
        { title: "Board Scholarship", meta: "Higher Secondary School Certificate · 2017" }
      ]
    },

    leadership: {
      title: "Chapters, competitions and training",
      lead: "Professional activities in Bangladesh and Michigan.",
      items: [
        { title: "Vice Secretary, ITE Student Chapter", meta: "Western Michigan University · Sep 2025 – Present" },
        { title: "Deputy Secretary, Internal Affairs, ASCE Student Chapter", meta: "BUET · 2022 – 2023" },
        { title: "Participant, ITE Safe System Approach Student Competition", meta: "2025" },
        { title: "Attendee, Joint ITE International and Great Lakes District Annual Meeting and Exhibition", meta: "2026" },
        { title: "CITI Program: Graduate College Responsible Conduct of Research", meta: "2025" }
      ]
    }
  }
};

/* Short versions for the intersection card, which must fit one fixed-size box
   without scrolling. The full text above is used by the map and the plain CV. */
window.SITE.cards = {
  welcome: {
    title: "Khandokar Tanvir Rahman",
    lead: "Transportation engineering graduate student working on traffic operations, safety and the data behind them.",
    items: [
      { title: "M.S. Civil Engineering (Transportation)", meta: "Western Michigan University · 2025 – Present · GPA 3.88" },
      { title: "Winner, ITE Great Lakes District design competition", meta: "Turbo roundabout redesign · 2026" },
      { title: "2 conference papers · 7 courses taught", meta: "Waterbus services · crash forecasting" }
    ]
  },
  about: {
    title: "From Dhaka's rivers to Michigan's roads",
    lead: "I work on traffic operations, safety and the data behind them: work zones, crash trends, signals and transit.",
    items: [
      { title: "M.S. Civil Engineering (Transportation)", meta: "Western Michigan University · 2025 – Present · GPA 3.88 / 4.00" },
      { title: "B.Sc. Civil Engineering (Transportation)", meta: "BUET, Dhaka · 2023 · GPA 3.49 / 4.00", text: "Thesis on Dhaka's waterbus service and its passengers." },
      { title: "Interests", tags: ["ITS", "Safety", "Connected and automated vehicles", "Traffic operations", "Work zones", "Planning", "Simulation"] }
    ],
    cta: { label: "Take the guided tour", href: "tour.html" }
  },
  research: {
    title: "Work-zone user delay and cost",
    lead: "Evaluating how the Michigan DOT estimates the delay and cost that work zones impose on road users.",
    items: [
      { title: "Graduate Research Assistant, ITS Lab, WMU", meta: "Aug 2025 – Present · Sponsor: Michigan Department of Transportation",
        bullets: ["Five data sources: RITIS, Bluetooth, API feeds, MVDS and video", "Cleaned and compared them for delay and queue evaluation", "Reviewed vehicle operating cost methods"] },
      { title: "Undergraduate research, BUET", meta: "2022 – 2023", text: "Waterbus passenger survey and ARIMA crash forecasting." }
    ]
  },
  papers: {
    title: "Two peer-reviewed conference papers",
    items: [
      { title: "Waterbus services and passenger preferences", meta: "ICCESD 2024 · Rahman, Shristi, Shahriar & Rahman",
        text: "Why Dhaka's first waterbus failed, and what would make the next one work.",
        links: [{ label: "Read on ResearchGate", href: "https://www.researchgate.net/publication/379118004" }] },
      { title: "Forecasting unauthorized-vehicle crashes in Bangladesh", meta: "ICACE 2022 · Huq, Rahman & Shristi",
        text: "ARIMA(6,1,7) on police crash records, 2009–2015, forecast to 2020.",
        links: [{ label: "Read on ResearchGate", href: "https://www.researchgate.net/publication/368713906" }] }
    ]
  },
  projects: {
    title: "Design, capstone and industry projects",
    items: [
      { title: "Turbo roundabout redesign", meta: "Winner, ITE Great Lakes District design competition · 2026",
        text: "Spiral lanes for a high-crash two-lane roundabout. 20-year B/C = 1.12." },
      { title: "Buriganga River channel restoration", meta: "BUET capstone · 2023",
        text: "Integrated roadway and waterway plan for Kamrangirchar." },
      { title: "CLIMAS knowledge tool", meta: "Indetechs Software, Dhaka · 2024 – 2025",
        text: "Python, NLP and ontologies for climate-assembly agendas." }
    ]
  },
  teaching: {
    title: "Seven courses at two universities",
    items: [
      { title: "Graduate Teaching Assistant", meta: "Western Michigan University · 2025 – Present",
        bullets: ["CCE 4300 – Traffic Design", "CCE 3300 – Transportation Engineering"] },
      { title: "Adjunct Lecturer", meta: "Presidency University, Dhaka · Spring and Summer 2025",
        tags: ["Transportation Engineering Sessional I", "Computer Programming Sessional", "Environmental Engineering Sessional I", "Environmental Engineering II", "Hydrology and Irrigation Engineering"] }
    ]
  }
};
