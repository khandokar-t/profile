/*
  All site content lives here. Every page reads from this one file,
  so the intersection, the tour and the CV never disagree.

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

  /* The home page has four sections. Each one is a signal stage: two concurrent
     phases, so opposing approaches move together, as at a real intersection.
     Academic Ave runs east–west, Career St north–south. */
  stages: {
    1: { key: "education", label: "Education",         phases: [1, 5], street: "Academic Ave", move: "left",    moveText: "protected left turns" },
    2: { key: "research",  label: "Research Projects", phases: [2, 6], street: "Academic Ave", move: "through", moveText: "through and right turns" },
    3: { key: "work",      label: "Work Experience",   phases: [3, 7], street: "Career St",    move: "left",    moveText: "protected left turns" },
    4: { key: "skills",    label: "Skills",            phases: [4, 8], street: "Career St",    move: "through", moveText: "through and right turns" }
  },

  /* The full record, used by the plain CV page. */
  sections: {
    education: [
      {
        title: "M.S. in Civil Engineering (Transportation)",
        where: "Western Michigan University, Kalamazoo, Michigan · GPA 3.88 / 4.00",
        when: "Aug 2025 – Present",
        text: "Graduate coursework: Transportation Planning; Travel Demand Analysis; Traffic Safety Engineering; Construction Project Delivery Systems; Civil Systems Analysis; Modeling and Analysis of Civil Engineering Application."
      },
      {
        title: "B.Sc. in Civil Engineering (Transportation)",
        where: "Bangladesh University of Engineering and Technology (BUET), Dhaka, Bangladesh · GPA 3.49 / 4.00",
        when: "May 2023",
        text: "Thesis: A Study on Waterbus Service to Analyze User Preferences and Implement Solutions."
      }
    ],

    research: [
      {
        title: "Graduate Research Assistant",
        where: "Intelligent Transportation System Lab, Western Michigan University",
        when: "Aug 2025 – Present",
        text: "Project: Evaluation of MDOT's Methodology for Estimating Work Zone User Delay Times and Costs. Sponsor: Michigan Department of Transportation.",
        bullets: [
          "Analyzed multi-source work-zone traffic data from RITIS, Bluetooth, API feeds, Microwave Vehicle Detection Systems (MVDS) and camera video: speed, volume, travel time, lane closures and work-zone layouts.",
          "Cleaned, processed, visualized and compared the sources to judge how consistent and suitable each is for work-zone delay and queue evaluation.",
          "Reviewed vehicle operating cost (VOC) methods for transparency, current validity, ease of use and fit with the available inputs. The findings supported treating VOC as reviewed but non-monetized when roadway-condition inputs are insufficient."
        ]
      },
      {
        title: "Undergraduate Research",
        where: "BUET",
        when: "2022 – 2023",
        bullets: [
          "Waterbus service and passenger preferences (undergraduate thesis): designed and ran a questionnaire survey on passenger preferences, service barriers and user-centred factors in Dhaka's waterbus system, and turned the findings into operating recommendations.",
          "Unauthorized vehicle-related crash forecasting: analyzed police-recorded crash data (2009–2015) and used ARIMA time-series models to forecast crashes for 2016–2020, with collision and severity patterns for safety planning."
        ]
      }
    ],

    papers: [
      {
        authors: "Rahman, K. T., Shristi, N. T., Shahriar, S. M. F., & Rahman, M. M.",
        date: "2024, March",
        title: "A Study on Waterbus Services Using Passenger Preferences Data and the Way Forward",
        venue: "7th International Conference on Civil Engineering for Sustainable Development (ICCESD 2024)",
        href: "https://www.researchgate.net/publication/379118004"
      },
      {
        authors: "Huq, A. S., Rahman, K. T., & Shristi, N. T.",
        date: "2022, December",
        title: "Time Series Forecasting the Unauthorized Vehicle-Related Crashes in Bangladesh",
        venue: "6th International Conference on Advances in Civil Engineering (ICACE 2022), CUET, Chattogram",
        href: "https://www.researchgate.net/publication/368713906"
      }
    ],

    teaching: [
      {
        title: "Graduate Teaching Assistant",
        where: "Western Michigan University",
        when: "Aug 2025 – Present",
        bullets: ["CCE 4300 – Traffic Design", "CCE 3300 – Transportation Engineering"]
      },
      {
        title: "Adjunct Lecturer",
        where: "Presidency University, Dhaka, Bangladesh",
        when: "Spring and Summer 2025",
        bullets: [
          "Transportation Engineering Sessional I",
          "Computer Programming Sessional",
          "Environmental Engineering Sessional I",
          "Environmental Engineering II",
          "Hydrology and Irrigation Engineering"
        ]
      }
    ],

    work: [
      {
        title: "Assistant Engineer",
        where: "Indetechs Software Limited, Dhaka, Bangladesh",
        when: "Apr 2024 – Aug 2025",
        text: "Project: Climate Change Citizens Engagement Toolbox for Dealing with Societal Resilience (CLIMAS).",
        bullets: [
          "Contributed to a Knowledge and Evidence-Based Support (KEBS) tool for climate-assembly agenda setting.",
          "Applied Python, machine learning and natural language processing (NLP) to organize and analyze decision-support information.",
          "Developed and organized ontologies that structure the knowledge and evidence in the system."
        ]
      }
    ],

    projects: [
      {
        title: "Safety and operational improvement of a high-crash two-lane roundabout",
        where: "Winner, Design Competition, ITE Great Lakes District Student Leadership Summit, Detroit, MI",
        when: "2026",
        bullets: [
          "Evaluated crash history, traffic demand, pedestrian conditions and operational alternatives; proposed a turbo (spiral) roundabout to reduce lane-changing conflicts in the circle and improve lane discipline.",
          "Developed pedestrian, signing and marking, safety and lifecycle-cost considerations, with a 20-year benefit–cost analysis (B/C = 1.12)."
        ]
      },
      {
        title: "Channel restoration of the Buriganga River and integrated development of roadway and waterway at Kamrangirchar",
        where: "Undergraduate capstone project, BUET",
        when: "2023",
        bullets: [
          "Developed an integrated concept: channel restoration and dredging, roadway improvements, bridge and jetty facilities, pedestrian walkways and riverbank protection.",
          "Evaluated how the improvements would raise connectivity, navigation, roadway capacity and multimodal access."
        ]
      }
    ],

    skills: [
      { title: "Transportation modeling and simulation", tags: ["PTV Vissim", "PTV Visum", "PTV Vistro", "HCS", "HSS"] },
      { title: "Programming and data analysis", tags: ["Python", "C++", "MATLAB", "StataSE", "Microsoft Excel"] },
      { title: "Transportation data", tags: ["RITIS", "Bluetooth traffic data", "API-based traffic data", "MVDS data", "Video-based traffic data"] },
      { title: "GIS and engineering software", tags: ["ArcGIS Pro", "AutoCAD", "ETABS", "SAP", "Protégé"] }
    ],

    leadership: [
      { title: "Vice Secretary, ITE Student Chapter", where: "Western Michigan University", when: "Sep 2025 – Present" },
      { title: "Deputy Secretary, Internal Affairs, ASCE Student Chapter", where: "BUET", when: "2022 – 2023" },
      { title: "Participant, ITE Safe System Approach Student Competition", where: "", when: "2025" },
      { title: "Attendee, Joint ITE International and Great Lakes District Annual Meeting and Exhibition", where: "", when: "2026" },
      { title: "CITI Program: Graduate College Responsible Conduct of Research", where: "", when: "2025" }
    ],

    awards: [
      { title: "Winner, Design Competition", where: "ITE Great Lakes District Student Leadership Summit, Detroit, MI", when: "2026" },
      { title: "Finalist, Traffic Bowl", where: "ITE Great Lakes District Student Leadership Summit", when: "2026" },
      { title: "First Runner-Up, Mechanics Maestro", where: "Eccentric Civil Engineering Festival, BUET", when: "2018" },
      { title: "Board Scholarship", where: "Higher Secondary School Certificate", when: "2017" }
    ]
  }
};

/* Short versions for the intersection card, which must fit one fixed-size box
   without scrolling. The tour tells the full story; the plain CV lists everything. */
window.SITE.cards = {
  welcome: {
    title: "Khandokar Tanvir Rahman",
    lead: "Transportation engineering graduate student working on traffic operations, safety and the data behind them.",
    items: [
      { title: "Four sections, four signal stages", text: "Pick Education, Research Projects, Work Experience or Skills below. Opposing approaches get the green together, like a real signal." },
      { title: "M.S. Civil Engineering (Transportation)", meta: "Western Michigan University · 2025 – Present · GPA 3.88" },
      { title: "Winner, ITE Great Lakes District design competition", meta: "Turbo roundabout redesign · 2026" }
    ],
    cta: { label: "Take the guided tour", href: "tour.html" }
  },
  education: {
    title: "Education",
    lead: "Civil engineering with a transportation major, in Dhaka and in Michigan.",
    items: [
      { title: "M.S. in Civil Engineering (Transportation)", meta: "Western Michigan University, Kalamazoo · Aug 2025 – Present · GPA 3.88 / 4.00",
        text: "Coursework: Transportation Planning, Travel Demand Analysis, Traffic Safety Engineering, Civil Systems Analysis, Construction Project Delivery Systems." },
      { title: "B.Sc. in Civil Engineering (Transportation)", meta: "BUET, Dhaka, Bangladesh · May 2023 · GPA 3.49 / 4.00",
        text: "Thesis: a study of Dhaka's waterbus service, its passengers and how to bring it back." },
      { title: "Board Scholarship", meta: "Higher Secondary Certificate · 2017" }
    ],
    cta: { label: "Take the guided tour", href: "tour.html" }
  },
  research: {
    title: "Research Projects",
    items: [
      { title: "Work-zone user delay and cost", meta: "Graduate Research Assistant, ITS Lab, WMU · 2025 – Present · Sponsor: MDOT",
        text: "Comparing RITIS, Bluetooth, API, MVDS and video data to evaluate how MDOT estimates the delay and cost of work zones." },
      { title: "Waterbus services and passenger preferences", meta: "Undergraduate thesis · ICCESD 2024 paper",
        text: "Why Dhaka's 2010 waterbus failed, from a 310-person survey and operator data, and a plan for a 110 km loop.",
        links: [{ label: "Paper", href: "https://www.researchgate.net/publication/379118004" }] },
      { title: "Forecasting unauthorized-vehicle crashes", meta: "ICACE 2022 paper",
        text: "ARIMA(6,1,7) on police crash records from 2009–2015, forecast to 2020.",
        links: [{ label: "Paper", href: "https://www.researchgate.net/publication/368713906" }] },
      { title: "Turbo roundabout redesign", meta: "Winner, ITE Great Lakes District design competition · 2026",
        text: "Spiral lanes for a high-crash two-lane roundabout. 20-year B/C = 1.12." },
      { title: "Buriganga River channel restoration", meta: "BUET capstone · 2023",
        text: "Integrated roadway and waterway plan for Kamrangirchar, Dhaka." }
    ]
  },
  work: {
    title: "Work Experience",
    items: [
      { title: "Graduate Research Assistant", meta: "ITS Lab, Western Michigan University · Aug 2025 – Present",
        text: "MDOT work-zone delay and cost: multi-source traffic data analysis." },
      { title: "Graduate Teaching Assistant", meta: "Western Michigan University · Aug 2025 – Present",
        text: "CCE 4300 Traffic Design · CCE 3300 Transportation Engineering." },
      { title: "Adjunct Lecturer", meta: "Presidency University, Dhaka · Spring and Summer 2025",
        text: "Five courses: three labs (transportation, programming, environmental) and two lecture courses (Environmental Engineering II; Hydrology and Irrigation Engineering)." },
      { title: "Assistant Engineer", meta: "Indetechs Software Limited, Dhaka · Apr 2024 – Aug 2025",
        text: "CLIMAS project: Python, NLP and ontologies for a climate-assembly decision-support tool." },
      { title: "Leadership", meta: "Vice Secretary, ITE Student Chapter, WMU · 2025 – Present",
        text: "Earlier: Deputy Secretary, Internal Affairs, ASCE Student Chapter, BUET (2022 – 2023)." }
    ]
  },
  skills: {
    title: "Skills",
    items: [
      { title: "Modeling and simulation", tags: ["PTV Vissim", "PTV Visum", "PTV Vistro", "HCS", "HSS"] },
      { title: "Programming and data analysis", tags: ["Python", "C++", "MATLAB", "StataSE", "Microsoft Excel"] },
      { title: "Transportation data", tags: ["RITIS", "Bluetooth", "API feeds", "MVDS", "Video"] },
      { title: "GIS and engineering software", tags: ["ArcGIS Pro", "AutoCAD", "ETABS", "SAP", "Protégé"] },
      { title: "Research interests", tags: ["ITS", "Transportation safety", "Connected and automated vehicles", "Traffic operations", "Work zones", "Planning", "Simulation"] }
    ]
  }
};
