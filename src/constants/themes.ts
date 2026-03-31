const SINGLE_COLOR_THEMES = [
    {
      name: "Aubergine", id: "aubergine", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-aubergine-80)) 20%, rgb(var(--dt_color-plt-aubergine-100)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-aubergine-0)) 20%, rgb(var(--dt_color-plt-aubergine-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#611F69",
          selectedItems: "#F9EDFF"
        },
        dark: {
          systemNav: "#611F69",
          selectedItems: "#DF9FF4"
        }
      }
    },
    {
      name: "Clementine", id: "clementine", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-tangerine-60)) 20%, rgb(var(--dt_color-plt-tangerine-80)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-tangerine-0)) 20%, rgb(var(--dt_color-plt-tangerine-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#DC540C",
          selectedItems: "#AC3D00"
        },
        dark: {
          systemNav: "#DC540C",
          selectedItems: "#F89B6C"
        }
      }
    },
    {
      name: "Banana", id: "banana", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-sunflower-5)) 20%, rgb(var(--dt_color-plt-sunflower-20)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-sunflower-0)) 20%, rgb(var(--dt_color-plt-sunflower-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#FFF4B8",
          selectedItems: "#8B6800"
        },
        dark: {
          systemNav: "#FFF4B8",
          selectedItems: "#FFC600"
        }
      }
    },
    {
      name: "Jade", id: "jade", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-jade-60)) 20%, rgb(var(--dt_color-plt-jade-80)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-jade-0)) 20%, rgb(var(--dt_color-plt-jade-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#178F65",
          selectedItems: "#0E674D"
        },
        dark: {
          systemNav: "#178F65",
          selectedItems: "#4CC894"
        }
      }
    },
    {
      name: "Lagoon", id: "lagoon", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-lagoon-70)) 20%, rgb(var(--dt_color-plt-lagoon-90)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-lagoon-0)) 20%, rgb(var(--dt_color-plt-lagoon-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#0071A4",
          selectedItems: "#E3F8FF"
        },
        dark: {
          systemNav: "#0071A4",
          selectedItems: "#36C5F0"
        }
      }
    },
    {
      name: "Barbra", id: "barbra", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-flamingo-10)) 20%, rgb(var(--dt_color-plt-flamingo-30)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-flamingo-0)) 20%, rgb(var(--dt_color-plt-flamingo-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#FFC4D9",
          selectedItems: "#9E0B2E"
        },
        dark: {
          systemNav: "#FFC4D9",
          selectedItems: "#FF81AA"
        }
      }
    },
    {
      name: "Gray", id: "gray", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-gray-5)) 20%, rgb(var(--dt_color-plt-gray-20)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-gray-0)) 20%, rgb(var(--dt_color-plt-gray-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#EAEAEA",
          selectedItems: "#333133"
        },
        dark: {
          systemNav: "#EAEAEA",
          selectedItems: "#B5B5BA"
        }
      }
    },
    {
      name: "Mood Indigo", id: "mood-indigo", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-indigo-80)) 20%, rgb(var(--dt_color-plt-indigo-100)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-indigo-0)) 20%, rgb(var(--dt_color-plt-indigo-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#1E328F",
          selectedItems: "#1E328F"
        },
        dark: {
          systemNav: "#1E328F",
          selectedItems: "#7D95EB"
        }
      }
    },
  ]

  const VISION_ASSISTIVE_THEMES = [
    {
      name: "Tritanopia", id: "tritanopia", bg: {
        light: `linear-gradient(135deg, color-mix(in srgb, rgb(0, 0, 0) 70%, rgb(255, 255, 255)) 20%, rgb(0, 0, 0) 80%)`,
        dark: `linear-gradient(135deg, color-mix(in srgb, rgb(0, 0, 0) 70%, rgb(255, 255, 255)) 20%, rgb(0, 0, 0) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#000000",
          selectedItems: "#F8F8F8"
        },
        dark: {
          systemNav: "#000000",
          selectedItems: "#F8F8F8"
        }
      }
    },
    {
      name: "Protanopia & Deuteranopia", id: "protanopia-and-deuteranopia", bg: {
        light: `linear-gradient(135deg, color-mix(in srgb, rgb(45, 0, 51) 70%, rgb(255, 255, 255)) 20%, rgb(45, 0, 51) 80%)`,
        dark: `linear-gradient(135deg, color-mix(in srgb, rgb(45, 0, 51) 70%, rgb(255, 255, 255)) 20%, rgb(45, 0, 51) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#2D0033",
          selectedItems: "#F9EDFF"
        },
        dark: {
          systemNav: "#2D0033",
          selectedItems: "#F9EDFF"
        }
      }
    },
  ]

  const FUN_NEW_THEMES = [
    {
      name: "Raspberry Beret", id: "raspberry-beret", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-aubergine-10)) 20%, rgb(var(--dt_color-plt-flamingo-30)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-aubergine-0)) 20%, rgb(var(--dt_color-plt-flamingo-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#F4DAFF",
          selectedItems: "#9E0B2E"
        },
        dark: {
          systemNav: "#F4DAFF",
          selectedItems: "#FF81AA"
        }
      }
    },
    {
      name: "Big Business", id: "big-business", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-gray-60)) 20%, rgb(var(--dt_color-plt-indigo-80)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-gray-0)) 20%, rgb(var(--dt_color-plt-indigo-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#5E5D60",
          selectedItems: "#1E328F"
        },
        dark: {
          systemNav: "#5E5D60",
          selectedItems: "#7D95EB"
        }
      }
    },
    {
      name: "POG", id: "pog", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-sangria-10)) 20%, rgb(var(--dt_color-plt-honeycomb-30)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-sangria-0)) 20%, rgb(var(--dt_color-plt-honeycomb-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#F6D2E2",
          selectedItems: "#8E5B00"
        },
        dark: {
          systemNav: "#F6D2E2",
          selectedItems: "#ECB22E"
        }
      }
    },
    {
      name: "Mint Chip", id: "mint-chip", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-cilantro-10)) 20%, rgb(var(--dt_color-plt-indigo-30)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-cilantro-0)) 20%, rgb(var(--dt_color-plt-indigo-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#C0ECAA",
          selectedItems: "#1E328F"
        },
        dark: {
          systemNav: "#C0ECAA",
          selectedItems: "#7D95EB"
        }
      }
    },
    {
      name: "Slackr", id: "slackr", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-flamingo-10)) 20%, rgb(var(--dt_color-plt-lagoon-30)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-flamingo-0)) 20%, rgb(var(--dt_color-plt-lagoon-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#E3CEB5",
          selectedItems: "#7C2852"
        },
        dark: {
          systemNav: "#E3CEB5",
          selectedItems: "#E296B9"
        }
      }
    },
    {
      name: "Chill Vibes", id: "chill-vibes", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-jade-60)) 20%, rgb(var(--dt_color-plt-aquarium-80)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-jade-0)) 20%, rgb(var(--dt_color-plt-aquarium-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#178F65",
          selectedItems: "#E3FFFF"
        },
        dark: {
          systemNav: "#178F65",
          selectedItems: "#53BFC9"
        }
      }
    },
    {
      name: "PB&J", id: "pbj", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-horchata-10)) 20%, rgb(var(--dt_color-plt-sangria-30)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-horchata-0)) 20%, rgb(var(--dt_color-plt-sangria-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#E3CEB5",
          selectedItems: "#7C2852"
        },
        dark: {
          systemNav: "#E3CEB5",
          selectedItems: "#E296B9"
        }
      }
    },
    {
      name: "Forest Floor", id: "forest-floor", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-grass-60)) 20%, rgb(var(--dt_color-plt-horchata-80)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-grass-0)) 20%, rgb(var(--dt_color-plt-horchata-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#608813",
          selectedItems: "#663F18"
        },
        dark: {
          systemNav: "#608813",
          selectedItems: "#BF9668"
        }
      }
    },
    {
      name: "Sunrise", id: "sunrise", bg: {
        light: `linear-gradient(135deg, rgb(var(--dt_color-plt-tangerine-5)) 20%, rgb(var(--dt_color-plt-flamingo-20)) 80%)`,
        dark: `linear-gradient(135deg, rgb(var(--dt_color-plt-tangerine-0)) 20%, rgb(var(--dt_color-plt-flamingo-10)) 80%)`,
      },
      themeColor: {
        light: {
          systemNav: "#FFE3D6",
          selectedItems: "#9E0B2E"
        },
        dark: {
          systemNav: "#FFE3D6",
          selectedItems: "#FF81AA"
        }
      }
    },
  ]

export { SINGLE_COLOR_THEMES, VISION_ASSISTIVE_THEMES, FUN_NEW_THEMES }
