import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════════
   QUEST — CT Forward Planner · interactive mock-up  (v2)
   New in v2: multi-select bookings (Ctrl/Cmd-click, Shift-click for a
   run of dates, or Select mode) and drag-and-drop to move one or many
   bookings to different dates/units with live validity preview.
   Built on the Quest Medical design system. Data: real slice of the
   client's CT FP sheet, 20 Jan – 16 Feb 2025.
   ══════════════════════════════════════════════════════════════════ */

const UNITS = [{"id": "CT15", "desc": "Canon- 160 slice - lead lined & insufflator MAKO. Bayer Stellant injector"}, {"id": "CT16", "desc": "Canon- 160 slice - lead lined & insufflator. MAKO Approved.  Bayer Stellant injector"}, {"id": "CT17", "desc": "Canon- 160 slice - lead lined & insufflator (Cardiac enabled) MAKO Approved. Bayer Stellant injector"}, {"id": "CT18", "desc": "Canon- 160 slice - lead lined & insufflator (Cardiac enabled) MAKO Approved. Bayer Stellant Dual CWS injector"}, {"id": "CT19", "desc": "Canon- 160 slice lead lined (Cardiac enabled) NO INSUFFLATOR. MAKo Approved. Bayer Stellant Dual CWS injector"}, {"id": "CT20", "desc": "Canon- 160 slice - lead lined & insufflator (Cardiac enabled) . MAKO Approved. Bayer Stellant Dual CWS injector"}, {"id": "CT21", "desc": "Canon- 160 slice - lead lined (Cardiac enabled) INSUFFLATOR. MAKO Approved. Bayer Stellant Dual CWS injector"}, {"id": "RCT22", "desc": "Canon CT. Bayer Stellant D with CWS & OCS Mount dual flow injector"}, {"id": "CT23", "desc": "Cannon 160 Slice Bayer spectris solaris Injector"}, {"id": "CT24", "desc": "Canon- 160 slice lead lined (Cardiac enabled, MAKO approved ) NO INSUFFLATOR. Bayer Stellant injector"}, {"id": "CT25", "desc": "Canon- 160 slice lead lined (Cardiac enabled) NO INSUFFLATOR. Bayer Injector"}, {"id": "CT26", "desc": "(HP) cardiac enabled Bayer Stellant injector"}, {"id": "RCT27", "desc": "(HP) Bayer Stellant injector"}, {"id": "CT28", "desc": "Hybrid Bayer Stellant injector"}, {"id": "CT29", "desc": "(Hybrid) Bayer Stellant injector"}, {"id": "CT30", "desc": "Canon (Hybrid) Bayer Injector"}, {"id": "CT31", "desc": "Canon (Hybrid)  Bayer Centargo Injector"}, {"id": "CT32", "desc": "Canon (Hybrid) Bayer Injector"}, {"id": "CT33", "desc": "(canon) EXPANDABLE (9 Metre) MIS Nemoto Sonic Shot 7"}, {"id": "CT34", "desc": "(CANON) EXPANDABLE (9 metre) MIS Nemoto Sonic Shot 7"}, {"id": "CT35", "desc": "Mobile - CARDIAC ENABLED Bayer Injector"}, {"id": "CT36", "desc": "Mobile - cadiac enabled Bayer Injector"}, {"id": "CT37", "desc": ""}, {"id": "CT38", "desc": "Expandable (14metre) MIS Dual Shot Alpha 7 CT Injector"}, {"id": "CT39", "desc": "Expandable (14 meter) MIS Alpha 7 CT"}, {"id": "CT40", "desc": "Mobile - CARDIAC ENABLED Bayer Stellant Dual"}, {"id": "CT41", "desc": "mobile - CARDIAC ENABLED Bayer Stellant Dual"}, {"id": "CT42", "desc": "mobile - CARDIAC ENABLED Bayer Stellant Dual"}, {"id": "CT43", "desc": "mobile - CARDIAC ENABLED Bayer Stellant Dual"}, {"id": "CT44", "desc": "mobile - CARDIAC ENABLED Bayer Stellant Dual"}, {"id": "CT45", "desc": "mobile - only LHC Plymouth Centargo Injector"}];
const DAYS = [{"date": "2025-01-20", "dow": "Mon", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Queens Diamond Jubilee Centre", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Sainsnury's Arnold", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Asda Yeovil", "s": "confirmed"}, "CT24": {"loc": "LHC Merry Hill Car Park", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Mogden Lane", "s": "confirmed"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "Scarborough", "s": "confirmed"}, "CT32": {"loc": "OR-PPM", "s": "service"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT38": {"loc": "OR-Heyford Annual", "s": "service"}, "CT40": {"loc": "SW-Yeovil", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "confirmed"}, "CT43": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "confirmed"}, "CT44": {"loc": "LHC Asda Crawley", "s": "confirmed"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-01-21", "dow": "Tue", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Queens Diamond Jubilee Centre", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Sainsnury's Arnold", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "Spire Clare Park", "s": "confirmed"}, "CT24": {"loc": "LHC Merry Hill Car Park", "s": "confirmed"}, "CT25": {"loc": "Borders", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Mogden Lane", "s": "confirmed"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "Scarborough", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT38": {"loc": "OR-Heyford Annual", "s": "service"}, "CT39": {"loc": "OR-Heyford Clean", "s": "service"}, "CT40": {"loc": "SW-Yeovil", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT43": {"loc": "LHC Sainsbry's Trowbridge", "s": "confirmed"}, "CT44": {"loc": "LHC Asda Crawley", "s": "confirmed"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-01-22", "dow": "Wed", "cells": {"CT15": {"loc": "OR-Heyford Canon PM", "s": "service"}, "CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Tesco Extra Bedworth", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Asda New Ollerton Supermarket", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT25": {"loc": "Borders", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "Scarborough", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "LHC Asda Slough", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT38": {"loc": "OR-Heyford Annual", "s": "service"}, "CT40": {"loc": "SW-Yeovil", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT44": {"loc": "LHC HMP Leyhill", "s": "confirmed"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-01-23", "dow": "Thu", "cells": {"CT15": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "OR-Heyford", "s": "service"}, "CT19": {"loc": "LHC Tesco Extra Bedworth", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Asda New Ollerton Supermarket", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT25": {"loc": "Borders", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "OR- Quest Warrington clean", "s": "service"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "LHC Asda Slough", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT38": {"loc": "OR-Heyford Annual", "s": "service"}, "CT40": {"loc": "SW-Yeovil", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT44": {"loc": "LHC HMP Leyhill", "s": "confirmed"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-01-24", "dow": "Fri", "cells": {"CT15": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "OR-Heyford", "s": "service"}, "CT19": {"loc": "LHC Tesco Extra Bedworth", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Asda New Ollerton Supermarket", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "Croft Shifa (vista)", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT25": {"loc": "Borders", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "Vista Sheffield", "s": "confirmed"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "LHC Asda Slough", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT38": {"loc": "OR-Heyford Annual & clean", "s": "service"}, "CT40": {"loc": "SW-Yeovil", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "confirmed"}, "CT43": {"loc": "LHC Barking Sporthourse and Gym", "s": "confirmed"}, "CT44": {"loc": "LHC Asda Bristol", "s": "confirmed"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-01-25", "dow": "Sat", "cells": {"CT15": {"loc": null, "s": "weekend"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": "Northern Devon SW", "s": "weekend"}, "CT19": {"loc": "LHC Tesco Extra Bedworth", "s": "weekend"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "weekend"}, "CT21": {"loc": "LHC Asda New Ollerton Supermarket", "s": "weekend"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": "LHC Southwood Clinic", "s": "weekend"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "weekend"}, "CT25": {"loc": "Borders", "s": "weekend"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "weekend"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "weekend"}, "CT30": {"loc": null, "s": "weekend"}, "CT31": {"loc": "Vista Sheffield", "s": "weekend"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": null, "s": "weekend"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": "OR-Heyford clean", "s": "service"}, "CT39": {"loc": null, "s": "weekend"}, "CT40": {"loc": null, "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "weekend"}, "CT43": {"loc": "LHC Barking Sporthourse and Gym", "s": "weekend"}, "CT44": {"loc": "LHC Asda Bristol", "s": "weekend"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "weekend"}}}, {"date": "2025-01-26", "dow": "Sun", "cells": {"CT15": {"loc": null, "s": "weekend"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": "UNI OF CHICHESTER", "s": "weekend"}, "CT19": {"loc": "LHC Tesco Extra Bedworth", "s": "weekend"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "weekend"}, "CT21": {"loc": "LHC Asda New Ollerton Supermarket", "s": "weekend"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": "LHC Southwood Clinic", "s": "weekend"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "weekend"}, "CT25": {"loc": "Borders", "s": "weekend"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "weekend"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "weekend"}, "CT30": {"loc": null, "s": "weekend"}, "CT31": {"loc": null, "s": "weekend"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": null, "s": "weekend"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": null, "s": "weekend"}, "CT39": {"loc": null, "s": "weekend"}, "CT40": {"loc": "LHC Odd Down Park & ride, Bath", "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "weekend"}, "CT43": {"loc": "LHC Barking Sporthourse and Gym", "s": "weekend"}, "CT44": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "weekend"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "weekend"}}}, {"date": "2025-01-27", "dow": "Mon", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT19": {"loc": "LHC Tesco Extra Bedworth", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Sainsnury's Arnold", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Blackbushe Airport, Camberley", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT25": {"loc": "Borders", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C Quarterley Onsite OOH", "s": "service"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "Scarborough", "s": "confirmed"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT40": {"loc": "LHC Fareham", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "confirmed"}, "CT43": {"loc": "LHC Barking Sporthourse and Gym", "s": "confirmed"}, "CT44": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "confirmed"}, "CT45": {"loc": "LHC Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-01-28", "dow": "Tue", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT19": {"loc": "LHC Asda Weston-Super-Mare", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Sainsnury's Arnold", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Blackbushe Airport, Camberley", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "Scarborough", "s": "confirmed"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "Spire Clare Park", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT40": {"loc": "LHC Fareham", "s": "confirmed"}, "CT41": {"loc": "Forth Valley - clean OOH", "s": "confirmed"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "confirmed"}, "CT43": {"loc": "LHC Barking Sporthourse and Gym", "s": "confirmed"}, "CT45": {"loc": "LHC Saltash Health Centre", "s": "confirmed"}}}, {"date": "2025-01-29", "dow": "Wed", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT19": {"loc": "LHC Asda Weston-Super-Mare", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Sainsnury's Arnold", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Blackbushe Airport, Camberley", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT25": {"loc": "LHC Asda Isle of Dogs", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "OR- Heyford Canon PM (overdue) & clean", "s": "service"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT31": {"loc": "Scarborough", "s": "confirmed"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT40": {"loc": "LHC Fareham", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "confirmed"}, "CT43": {"loc": "OR-Heyford", "s": "service"}, "CT45": {"loc": "OR- Heyford clean", "s": "service"}}}, {"date": "2025-01-30", "dow": "Thu", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT19": {"loc": "LHC Asda Weston-Super-Mare", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Sainsnury's Arnold", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Blackbushe Airport, Camberley", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT25": {"loc": "LHC Asda Isle of Dogs", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "OR- Heyford Physics", "s": "service"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "OR- Heyford clean", "s": "service"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT40": {"loc": "LHC Fareham", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "confirmed"}, "CT45": {"loc": "OR- Heyford Physics", "s": "service"}}}, {"date": "2025-01-31", "dow": "Fri", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT19": {"loc": "LHC Asda Weston-Super-Mare", "s": "confirmed"}, "CT20": {"loc": "LHC Peterlee Community Hospital", "s": "confirmed"}, "CT21": {"loc": "LHC Sainsnury's Arnold", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Blackbushe Airport, Camberley", "s": "confirmed"}, "CT24": {"loc": "LHC Mecca Oldbury", "s": "confirmed"}, "CT25": {"loc": "LHC Asda Isle of Dogs", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT29": {"loc": "OR- Heyford Canon correctives", "s": "service"}, "CT30": {"loc": "York", "s": "confirmed"}, "CT32": {"loc": "LHC Tesco Hartlepool", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT40": {"loc": "LHC Fareham", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "LHC Asda Stevenage", "s": "confirmed"}, "CT44": {"loc": "Vista Glasgow", "s": "confirmed"}}}, {"date": "2025-02-01", "dow": "Sat", "cells": {"CT15": {"loc": null, "s": "weekend"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": null, "s": "weekend"}, "CT19": {"loc": "LHC Tesco Mansfield", "s": "weekend"}, "CT20": {"loc": null, "s": "weekend"}, "CT21": {"loc": "LHC Tesco Gloucester", "s": "weekend"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": null, "s": "weekend"}, "CT24": {"loc": null, "s": "weekend"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "weekend"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "weekend"}, "CT29": {"loc": "LHC Asda Wallington", "s": "weekend"}, "CT30": {"loc": null, "s": "weekend"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "weekend"}, "CT32": {"loc": "LHC NHS Paybody", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Help Harries Help Others", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": null, "s": "weekend"}, "CT39": {"loc": null, "s": "weekend"}, "CT40": {"loc": "LHC Asda Fareham", "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": null, "s": "weekend"}, "CT43": {"loc": null, "s": "weekend"}, "CT44": {"loc": null, "s": "weekend"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "weekend"}}}, {"date": "2025-02-02", "dow": "Sun", "cells": {"CT15": {"loc": null, "s": "weekend"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": null, "s": "weekend"}, "CT19": {"loc": "LHC Tesco Mansfield", "s": "weekend"}, "CT20": {"loc": null, "s": "weekend"}, "CT21": {"loc": "LHC Tesco Gloucester", "s": "weekend"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": "OR- Quarterly service", "s": "bidding"}, "CT24": {"loc": null, "s": "weekend"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "weekend"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "weekend"}, "CT29": {"loc": "LHC Tesco Modgen Lane", "s": "weekend"}, "CT30": {"loc": null, "s": "weekend"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "weekend"}, "CT32": {"loc": "LHC NHS Paybody", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Help Harries Help Others", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": null, "s": "weekend"}, "CT39": {"loc": null, "s": "weekend"}, "CT40": {"loc": null, "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": null, "s": "weekend"}, "CT43": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "weekend"}, "CT44": {"loc": null, "s": "weekend"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "weekend"}}}, {"date": "2025-02-03", "dow": "Mon", "cells": {"CT16": {"loc": "Estuary View & clean OOH", "s": "service"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Tesco Mansfield", "s": "confirmed"}, "CT20": {"loc": "LHC Portsmouth", "s": "confirmed"}, "CT21": {"loc": "Bridlington", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "SW-CDC-Salisbury Health Centre", "s": "tbc"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Modgen Lane", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Help Harries Help Others", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Tesco Haslingden", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT43": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "confirmed"}, "CT44": {"loc": "Adelaide", "s": "confirmed"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "confirmed"}}}, {"date": "2025-02-04", "dow": "Tue", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Tesco Mansfield", "s": "confirmed"}, "CT20": {"loc": "LHC Portsmouth", "s": "confirmed"}, "CT21": {"loc": "Bridlington", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "SW-CDC-Salisbury Health Centre", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Tesco Haslingden", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT43": {"loc": "Spire Clare Park", "s": "confirmed"}, "CT44": {"loc": "Croft shifa - ENT", "s": "confirmed"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "confirmed"}}}, {"date": "2025-02-05", "dow": "Wed", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Tesco Mansfield", "s": "confirmed"}, "CT20": {"loc": "LHC Portsmouth", "s": "confirmed"}, "CT21": {"loc": "Bridlington", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "SW-CDC-Salisbury Health Centre", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "OR-Heyford PM Bayer", "s": "service"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Hove", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Tesco Haslingden", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT43": {"loc": "OR- Heyford Quaterly service", "s": "service"}, "CT44": {"loc": "OR- Heyford Quaterly service", "s": "service"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "confirmed"}}}, {"date": "2025-02-06", "dow": "Thu", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Tesco Mansfield", "s": "confirmed"}, "CT20": {"loc": "LHC Portsmouth", "s": "confirmed"}, "RCT22": {"loc": "OR- Norfolk & Norwich - Canon PM", "s": "service"}, "CT23": {"loc": "SW-CDC-Salisbury Health Centre", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "confirmed"}, "CT29": {"loc": "LHC Brent Valley Golf Course", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Sainsburys Hove", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Asda Colne", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT44": {"loc": "OR- Heyford Canon PM", "s": "service"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "confirmed"}}}, {"date": "2025-02-07", "dow": "Fri", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "Northern Devon SW", "s": "confirmed"}, "CT19": {"loc": "LHC Summit Centre", "s": "confirmed"}, "CT20": {"loc": "LHC Portsmouth", "s": "confirmed"}, "CT21": {"loc": "Lister", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "SW-CDC-Salisbury Health Centre", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "confirmed"}, "CT29": {"loc": "LHC Brent Valley Golf Course", "s": "confirmed"}, "CT30": {"loc": "OR-Heyford PM Canon", "s": "service"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Asda Hollingbury", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Asda Burnley", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "confirmed"}}}, {"date": "2025-02-08", "dow": "Sat", "cells": {"CT15": {"loc": null, "s": "weekend"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": "Northern Devon SW", "s": "weekend"}, "CT19": {"loc": "LHC Summit Centre", "s": "weekend"}, "CT20": {"loc": null, "s": "weekend"}, "CT21": {"loc": "Lister", "s": "weekend"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": "SW-CDC-Salisbury Health Centre", "s": "weekend"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "weekend"}, "CT25": {"loc": "LHC Bridgwater Rugby club", "s": "weekend"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": "LHC Asda West Swindon", "s": "weekend"}, "CT29": {"loc": "LHC Brent Valley Golf Course", "s": "weekend"}, "CT30": {"loc": null, "s": "weekend"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "weekend"}, "CT32": {"loc": "LHC NHS Paybody", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Asda Hollingbury", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": null, "s": "weekend"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "weekend"}, "CT40": {"loc": "LHC Asda Burnley", "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": "LHC Mecca Bingo, Oldbury", "s": "weekend"}, "CT43": {"loc": null, "s": "weekend"}, "CT44": {"loc": "UNI OF CHICHESTER", "s": "weekend"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "weekend"}}}, {"date": "2025-02-09", "dow": "Sun", "cells": {"CT15": {"loc": null, "s": "weekend"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": null, "s": "weekend"}, "CT19": {"loc": "LHC Summit Centre", "s": "weekend"}, "CT20": {"loc": null, "s": "weekend"}, "CT21": {"loc": "Lister", "s": "weekend"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": "SW-CDC-Salisbury Health Centre", "s": "weekend"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "weekend"}, "CT25": {"loc": "OR- Heyford clean", "s": "bidding"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": null, "s": "weekend"}, "CT29": {"loc": "LHC Brent Valley Golf Course", "s": "weekend"}, "CT30": {"loc": null, "s": "weekend"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "weekend"}, "CT32": {"loc": "LHC NHS Paybody", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Asda Hollingbury", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": null, "s": "weekend"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "weekend"}, "CT40": {"loc": "LHC Asda Burnley", "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": "LHC Mecca Bingo, Oldbury", "s": "weekend"}, "CT43": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "weekend"}, "CT44": {"loc": "UNI OF CHICHESTER", "s": "weekend"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "weekend"}}}, {"date": "2025-02-10", "dow": "Mon", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "OR-HAYDOCK ANNUAL", "s": "service"}, "CT19": {"loc": "LHC Summit Centre", "s": "confirmed"}, "CT20": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "confirmed"}, "CT21": {"loc": "Lister", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Merry Hill Car Park", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda Fareham", "s": "confirmed"}, "CT29": {"loc": "LHC Brent Valley Golf Course", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "OR-Heyford PM Canon", "s": "service"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Asda Hollingbury", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Asda Burnley", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "Bridlington", "s": "confirmed"}, "CT43": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "confirmed"}, "CT44": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT45": {"loc": "LHC Sainsbury's Penzance", "s": "confirmed"}}}, {"date": "2025-02-11", "dow": "Tue", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "OR-HAYDOCK ANNUAL", "s": "service"}, "CT19": {"loc": "LHC Summit Centre", "s": "confirmed"}, "CT20": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "confirmed"}, "CT21": {"loc": "Spire Clare Park", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Merry Hill Car Park", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda Fareham", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Peterlee community Hospital", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "OR- Heyford Canon PM", "s": "service"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "Bridlington", "s": "confirmed"}, "CT43": {"loc": "LHC Asda Burnley", "s": "confirmed"}, "CT44": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT45": {"loc": "LHC Asda Newquay", "s": "confirmed"}}}, {"date": "2025-02-12", "dow": "Wed", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "OR-HAYDOCK ANNUAL", "s": "service"}, "CT19": {"loc": "OR-heyford CANON PM", "s": "service"}, "CT20": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "confirmed"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Merry Hill Car Park", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda Fareham", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "LHC Asda Yeovil", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC NHS Paybody", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Peterlee community Hospital", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Asda Burnley", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "Bridlington", "s": "confirmed"}, "CT43": {"loc": "OR-Heyford PM & Clean", "s": "service"}, "CT44": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT45": {"loc": "LHC Asda Newquay", "s": "confirmed"}}}, {"date": "2025-02-13", "dow": "Thu", "cells": {"CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "OR-HAYDOCK ANNUAL", "s": "service"}, "CT20": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "confirmed"}, "CT21": {"loc": "OR-Heyford Annual", "s": "service"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Merry Hill Car Park", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "OR- K&C - Canon PM", "s": "service"}, "CT28": {"loc": "LHC Asda Fareham", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "LHC Asda Weston Super Mare", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "OR-Heyford Quaterly", "s": "service"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Peterlee community Hospital", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Asda Burnley", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "LHC Queens DIamond Jubilee Centre", "s": "confirmed"}, "CT43": {"loc": "Croft Shifa (vista)", "s": "confirmed"}, "CT44": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT45": {"loc": "LHC Asda Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-02-14", "dow": "Fri", "cells": {"CT15": {"loc": "RD-Newton Abbott", "s": "bidding"}, "CT16": {"loc": "Estuary View", "s": "confirmed"}, "CT17": {"loc": "West Cumberland", "s": "confirmed"}, "CT18": {"loc": "OR-HAYDOCK ANNUAL & clean", "s": "service"}, "CT20": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "confirmed"}, "CT21": {"loc": "OR-Heyford Annual", "s": "service"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "confirmed"}, "CT23": {"loc": "LHC Merry Hill Car Park", "s": "confirmed"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "confirmed"}, "CT25": {"loc": "LHC Tesco Plymouth", "s": "confirmed"}, "CT26": {"loc": "Aberdeen", "s": "confirmed"}, "RCT27": {"loc": "K&C", "s": "confirmed"}, "CT28": {"loc": "LHC Asda Fareham", "s": "confirmed"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "confirmed"}, "CT30": {"loc": "LHC Asda Weston Super Mare", "s": "confirmed"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "confirmed"}, "CT32": {"loc": "LHC Asda Strelley", "s": "confirmed"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "confirmed"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "confirmed"}, "CT36": {"loc": "LHC Peterlee community Hospital", "s": "confirmed"}, "CT37": {"loc": "HEATHERWOOD", "s": "confirmed"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "confirmed"}, "CT40": {"loc": "LHC Asda Burnley", "s": "confirmed"}, "CT41": {"loc": "Forth Valley", "s": "confirmed"}, "CT42": {"loc": "LHC Queens DIamond Jubilee Centre", "s": "confirmed"}, "CT44": {"loc": "UNI OF CHICHESTER", "s": "confirmed"}, "CT45": {"loc": "LHC Asda Westbourne Car Park", "s": "confirmed"}}}, {"date": "2025-02-15", "dow": "Sat", "cells": {"CT15": {"loc": "RD-Newton Abbott", "s": "bidding"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": null, "s": "weekend"}, "CT19": {"loc": null, "s": "weekend"}, "CT20": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "weekend"}, "CT21": {"loc": "OR-Heyford Annual", "s": "service"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": "LHC Merry Hill Car Park", "s": "weekend"}, "CT24": {"loc": "LHC Sainsburys Melksham", "s": "weekend"}, "CT25": {"loc": "LHC Tesco Plymouth", "s": "weekend"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": "LHC Asda Fareham", "s": "weekend"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "weekend"}, "CT30": {"loc": "LHC Asda Hastings", "s": "weekend"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "weekend"}, "CT32": {"loc": "LHC Asda Strelley", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Peterlee community Hospital", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": null, "s": "weekend"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "weekend"}, "CT40": {"loc": null, "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": "LHC Queens DIamond Jubilee Centre", "s": "weekend"}, "CT43": {"loc": "LHC Asda Bedminster", "s": "weekend"}, "CT44": {"loc": "LHC Asda Isle of Dogs", "s": "weekend"}, "CT45": {"loc": "LHC Asda Westbourne Car Park", "s": "weekend"}}}, {"date": "2025-02-16", "dow": "Sun", "cells": {"CT15": {"loc": "RD-Newton Abbott", "s": "bidding"}, "CT16": {"loc": "Estuary View", "s": "weekend"}, "CT17": {"loc": "West Cumberland", "s": "weekend"}, "CT18": {"loc": null, "s": "weekend"}, "CT19": {"loc": "Northern Devon SW", "s": "weekend"}, "CT20": {"loc": "ASDA Milton Keynes (external TLHC)", "s": "weekend"}, "CT21": {"loc": "OR-Heyford Annual", "s": "service"}, "RCT22": {"loc": "Norfolk & Norwich", "s": "weekend"}, "CT23": {"loc": "LHC Merry Hill Car Park", "s": "weekend"}, "CT24": {"loc": "LHC SWAG", "s": "likely"}, "CT25": {"loc": "LHC Tesco Plymouth", "s": "weekend"}, "CT26": {"loc": "Aberdeen", "s": "weekend"}, "RCT27": {"loc": "K&C", "s": "weekend"}, "CT28": {"loc": "LHC Asda Bristol", "s": "weekend"}, "CT29": {"loc": "LHC Tesco Sutton", "s": "weekend"}, "CT30": {"loc": "LHC Asda Hastings", "s": "weekend"}, "CT31": {"loc": "LHC Asda Portrack Lane", "s": "weekend"}, "CT32": {"loc": "LHC Asda Strelley", "s": "weekend"}, "CT33": {"loc": "Salisbury SW (unstaffed)", "s": "weekend"}, "CT34": {"loc": "RD-Spire Wellsley", "s": "bidding"}, "CT35": {"loc": "SW - Great western", "s": "weekend"}, "CT36": {"loc": "LHC Peterlee community Hospital", "s": "weekend"}, "CT37": {"loc": "HEATHERWOOD", "s": "weekend"}, "CT38": {"loc": null, "s": "weekend"}, "CT39": {"loc": "Nottingham Treatment Centre (unstaffed)", "s": "weekend"}, "CT40": {"loc": null, "s": "weekend"}, "CT41": {"loc": "Forth Valley", "s": "weekend"}, "CT42": {"loc": "LHC Tesco Bedworth", "s": "weekend"}, "CT43": {"loc": "Weston (Locality) CDC - unstaffed only CT43 or CT44", "s": "weekend"}, "CT44": {"loc": "LHC Asda Isle of Dogs", "s": "weekend"}, "CT45": {"loc": "LHC Asda Westbourne Car Park", "s": "weekend"}}}];
const SITES = ["ASDA Milton Keynes (external TLHC)", "Aberdeen", "Adelaide", "Borders", "Bridlington", "Croft Shifa (vista)", "Croft shifa - ENT", "Estuary View", "Estuary View & clean OOH", "Forth Valley", "Forth Valley - clean OOH", "HEATHERWOOD", "K&C", "K&C Quarterley Onsite OOH", "LHC Asda Bedminster", "LHC Asda Bristol", "LHC Asda Burnley", "LHC Asda Colne", "LHC Asda Crawley", "LHC Asda Fareham", "LHC Asda Hastings", "LHC Asda Hollingbury", "LHC Asda Isle of Dogs", "LHC Asda New Ollerton Supermarket", "LHC Asda Newquay", "LHC Asda Portrack Lane", "LHC Asda Slough", "LHC Asda Stevenage", "LHC Asda Strelley", "LHC Asda Wallington", "LHC Asda West Swindon", "LHC Asda Westbourne Car Park", "LHC Asda Weston Super Mare", "LHC Asda Weston-Super-Mare", "LHC Asda Yeovil", "LHC Barking Sporthourse and Gym", "LHC Blackbushe Airport, Camberley", "LHC Brent Valley Golf Course", "LHC Bridgwater Rugby club", "LHC Fareham", "LHC HMP Leyhill", "LHC Help Harries Help Others", "LHC Mecca Bingo, Oldbury", "LHC Mecca Oldbury", "LHC Merry Hill Car Park", "LHC NHS Paybody", "LHC Odd Down Park & ride, Bath", "LHC Peterlee Community Hospital", "LHC Peterlee community Hospital", "LHC Portsmouth", "LHC Queens DIamond Jubilee Centre", "LHC Queens Diamond Jubilee Centre", "LHC SWAG", "LHC Sainsbry's Trowbridge", "LHC Sainsbury's Penzance", "LHC Sainsburys Hove", "LHC Sainsburys Melksham", "LHC Sainsnury's Arnold", "LHC Saltash Health Centre", "LHC Southwood Clinic", "LHC Summit Centre", "LHC Tesco Bedworth", "LHC Tesco Extra Bedworth", "LHC Tesco Gloucester", "LHC Tesco Hartlepool", "LHC Tesco Haslingden", "LHC Tesco Mansfield", "LHC Tesco Modgen Lane", "LHC Tesco Mogden Lane", "LHC Tesco Plymouth", "LHC Tesco Sutton", "LHC Westbourne Car Park", "Lister", "Norfolk & Norwich", "Northern Devon SW", "Nottingham Treatment Centre (unstaffed)", "OR- Heyford Canon PM", "OR- Heyford Canon PM (overdue) & clean", "OR- Heyford Canon correctives", "OR- Heyford Physics", "OR- Heyford Quaterly service", "OR- Heyford clean", "OR- K&C - Canon PM", "OR- Norfolk & Norwich - Canon PM", "OR- Quarterly service", "OR- Quest Warrington clean", "OR-HAYDOCK ANNUAL", "OR-HAYDOCK ANNUAL & clean", "OR-Heyford", "OR-Heyford Annual", "OR-Heyford Annual & clean", "OR-Heyford Canon PM", "OR-Heyford Clean", "OR-Heyford PM & Clean", "OR-Heyford PM Bayer", "OR-Heyford PM Canon", "OR-Heyford Quaterly", "OR-Heyford clean", "OR-PPM", "OR-heyford CANON PM", "RD-Newton Abbott", "RD-Spire Wellsley", "SW - Great western", "SW-CDC-Salisbury Health Centre", "SW-Yeovil", "Salisbury SW (unstaffed)", "Scarborough", "Spire Clare Park", "UNI OF CHICHESTER", "Vista Glasgow", "Vista Sheffield", "West Cumberland", "Weston (Locality) CDC - unstaffed only CT43 or CT44", "York"];


const T = {
  navy: "#214b7f",
  navyDark: "#1a3d69",
  blue: "#2b7bb9",
  blueDark: "#1f5a87",
  blueTint: "#f0f7ff",
  sky: "#7ec8f5",
  crimson: "#b13a3a",
  heading: "#333333",
  body: "#757575",
  muted: "#9a9a9a",
  border: "#e6e6e6",
  surface: "#ffffff",
  surfaceAlt: "#f7f9fc",
  font: '"Roboto","Helvetica Neue",Arial,sans-serif',
};

const STATUSES = {
  confirmed: { label: "Confirmed", bg: "#ffffff", bar: T.navy, text: T.heading, border: T.border },
  weekend: { label: "Weekend confirmed", bg: "#eef0f4", bar: "#8b94a3", text: "#4a5261", border: "#dde1e8" },
  likely: { label: "Likely — awaiting confirmation", bg: "#e9f4ec", bar: "#3d7f53", text: "#28563a", border: "#cfe6d6" },
  bidding: { label: "Bidding for contract", bg: "#f9ebeb", bar: T.crimson, text: "#7c2a2a", border: "#efd3d3" },
  service: { label: "Corrective works / service", bg: "#e8f4fb", bar: T.blue, text: T.blueDark, border: "#cfe6f5" },
  tbc: { label: "Site to be confirmed", bg: "#fdf1e7", bar: "#f17f42", text: "#9a4d1e", border: "#f6ddc8" },
  cancelled: { label: "Cancelled by customer — chargeable", bg: "#f9ebf6", bar: "#c355ac", text: "#7d2f6c", border: "#eed2e8" },
  bankholiday: { label: "Bank holiday", bg: "#fbf4e2", bar: "#e0a826", text: "#7a5c10", border: "#f1e3bb" },
};
const STATUS_ORDER = ["confirmed", "likely", "tbc", "bidding", "service", "cancelled", "weekend", "bankholiday"];
const DOW_FULL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

const key = (date, unitId) => `${date}|${unitId}`;

function inRange(date, from, to) {
  return date >= from && date <= to;
}

/* Status hue at reduced strength — used for chip borders now the left bar is gone */
function tintBorder(hex, a = 0.5) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmtDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ── Small pieces ─────────────────────────────────────────────── */

function QuestLockup() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
      <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: "0.14em", color: "#fff" }}>QUEST</span>
      <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.35)", alignSelf: "center" }} />
      <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: "0.02em", color: "#e88f8f" }}>Forward Planner</span>
    </div>
  );
}

function Pill({ active, onClick, children, dot, tone }) {
  const activeBg = tone === "navy" ? T.navy : T.blue;
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: T.font, fontSize: 13, fontWeight: 400, lineHeight: "16px",
        padding: "7px 14px", borderRadius: 999, cursor: "pointer",
        border: `1px solid ${active ? activeBg : T.border}`,
        background: active ? activeBg : "#fff",
        color: active ? "#fff" : T.heading,
        display: "inline-flex", alignItems: "center", gap: 7,
        transition: "background 200ms, color 200ms, border-color 200ms",
      }}
    >
      {dot && <span style={{ width: 9, height: 9, borderRadius: 99, background: active ? "#fff" : dot, flexShrink: 0 }} />}
      {children}
    </button>
  );
}

/* ── Cell chip ────────────────────────────────────────────────── */
function CellChip({ cell, onClick, selected, checked, draggable, onDragStart, onDragEnd, preview }) {
  const isEmpty = !cell || !cell.loc;
  const previewStyle =
    preview === "ok"
      ? { border: `1.5px solid #3d7f53`, background: "#e9f4ec" }
      : preview === "bad"
      ? { border: `1.5px solid ${T.crimson}`, background: "#f9ebeb" }
      : null;

  if (isEmpty) {
    const wk = cell && cell.s === "weekend";
    return (
      <button
        onClick={onClick}
        title="Available — click to assign"
        style={{
          width: "100%", height: 40, borderRadius: 6, cursor: "pointer",
          border: `1px dashed ${selected ? T.blue : wk ? "#d4d9e1" : T.border}`,
          background: selected ? T.blueTint : "transparent",
          color: T.muted, fontSize: 12, fontFamily: T.font,
          transition: "border-color 150ms, background 150ms",
          ...(previewStyle || {}),
        }}
      >
        {selected ? "+" : ""}
      </button>
    );
  }
  const st = STATUSES[cell.s] || STATUSES.confirmed;
  const statusBorder = tintBorder(st.bar, cell.s === "confirmed" ? 0.28 : 0.5);
  const locked = !!cell.published;
  return (
    <button
      onClick={onClick}
      draggable={draggable && !locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${cell.loc || st.label} · ${st.label}${locked ? " · published & locked" : ""}${checked ? " · selected" : ""}\n${locked ? "Open to unlock · " : "Drag to move · "}Ctrl-click to multi-select`}
      style={{
        width: "100%", height: 40, borderRadius: 6, cursor: locked ? "pointer" : "grab",
        display: "flex", alignItems: "center", textAlign: "left",
        position: "relative",
        border: `1px solid ${checked ? T.blue : selected ? T.blue : statusBorder}`,
        boxShadow: checked
          ? `0 0 0 2px rgba(43,123,185,0.28)`
          : selected
          ? `0 0 0 2px ${T.blueTint}`
          : "none",
        background: st.bg, overflow: "hidden", padding: 0,
        opacity: locked ? 0.72 : 1,
        filter: locked ? "saturate(0.55)" : "none",
        transition: "box-shadow 150ms, border-color 150ms",
        ...(previewStyle || {}),
      }}
    >
      {locked && (
        <span style={{ paddingLeft: 7, fontSize: 11, color: T.muted, flexShrink: 0, lineHeight: 1 }} aria-hidden>🔒</span>
      )}
      <span
        style={{
          fontFamily: T.font, fontSize: 12, fontWeight: 400, color: st.text,
          padding: "0 8px", lineHeight: "14px",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", flex: 1,
        }}
      >
        {cell.loc || st.label}
      </span>
      {checked && (
        <span
          style={{
            position: "absolute", top: 3, right: 3, width: 14, height: 14, borderRadius: 99,
            background: T.blue, color: "#fff", fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

/* ── Availability bar ─────────────────────────────────────────── */
function AvailBar({ free, total }) {
  const pct = total ? free / total : 0;
  const col = pct > 0.4 ? "#3d7f53" : pct > 0.15 ? "#e0a826" : T.crimson;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#e9edf3", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", borderRadius: 99, background: col, transition: "width 300ms" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: col, fontVariantNumeric: "tabular-nums", minWidth: 18, textAlign: "right" }}>{free}</span>
    </div>
  );
}

/* ── Edit drawer ──────────────────────────────────────────────── */
function Drawer({ sel, units, onClose, onSave, onClear, onUnlock, sites }) {
  const unit = units.find((u) => u.id === sel.unitId);
  const locked = !!sel.cell?.published;
  const [loc, setLoc] = useState(sel.cell?.loc || "");
  const [status, setStatus] = useState(sel.cell?.s && sel.cell.s !== "weekend" && sel.cell.s !== "bankholiday" ? sel.cell.s : "confirmed");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    setLoc(sel.cell?.loc || "");
    setStatus(sel.cell?.s && sel.cell.s !== "weekend" && sel.cell.s !== "bankholiday" ? sel.cell.s : "confirmed");
    setNotes("");
    setQ("");
  }, [sel.date, sel.unitId]);

  const matches = q.length >= 2 ? sites.filter((s) => s.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const editable = ["confirmed", "likely", "tbc", "bidding", "service", "cancelled"];

  return (
    <aside
      style={{
        width: 340, flexShrink: 0, background: "#fff", borderLeft: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", fontFamily: T.font,
        boxShadow: "-6px 0 18px rgba(26,61,105,0.06)",
      }}
    >
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: locked ? T.muted : T.blue }}>
            {locked ? "🔒 Published & locked" : sel.cell?.loc ? "Edit booking" : "New booking"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.heading, marginTop: 4 }}>{unit?.id}</div>
          <div style={{ fontSize: 13, color: T.body, marginTop: 2 }}>{fmtDateLong(sel.date)}</div>
        </div>
        <button onClick={onClose} aria-label="Close panel" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: T.muted, lineHeight: 1, padding: 4 }}>×</button>
      </div>

      {locked ? (
        <div style={{ padding: "18px 22px", flex: 1 }}>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: T.surfaceAlt, fontSize: 13, color: T.body, lineHeight: "19px" }}>
            This booking has been forwarded to TMS and is locked for editing. Unlocking
            will make it editable again here, but won't notify TMS — coordinate any change
            with the team downstream.
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.heading }}>{sel.cell.loc}</div>
            <div style={{ fontSize: 12, color: T.body, marginTop: 2 }}>{(STATUSES[sel.cell.s] || STATUSES.confirmed).label}</div>
          </div>
        </div>
      ) : (
        <>
          {unit?.desc && (
            <div style={{ margin: "14px 22px 0", padding: "10px 12px", borderRadius: 8, background: T.surfaceAlt, fontSize: 12, lineHeight: "17px", color: T.body }}>
              {unit.desc}
            </div>
          )}

          <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: T.heading, marginBottom: 6 }}>Site location</label>
            <input
              value={loc}
              onChange={(e) => { setLoc(e.target.value); setQ(e.target.value); }}
              placeholder="Search or enter a site…"
              style={{
                width: "100%", boxSizing: "border-box", fontFamily: T.font, fontSize: 14,
                padding: "11px 16px", borderRadius: 999, border: `1px solid ${T.border}`,
                outline: "none", color: T.heading,
              }}
              onFocus={(e) => (e.target.style.borderColor = T.blue)}
              onBlur={(e) => { e.target.style.borderColor = T.border; setTimeout(() => setQ(""), 200); }}
            />
            {matches.length > 0 && (
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 6, overflow: "hidden" }}>
                {matches.map((m) => (
                  <button
                    key={m}
                    onMouseDown={() => { setLoc(m); setQ(""); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, fontFamily: T.font, border: "none", borderBottom: `1px solid ${T.surfaceAlt}`, background: "#fff", cursor: "pointer", color: T.heading }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: T.heading, margin: "20px 0 8px" }}>Status</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {editable.map((k) => {
                const st = STATUSES[k];
                const on = status === k;
                return (
                  <button
                    key={k}
                    onClick={() => setStatus(k)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: T.font,
                      border: `1px solid ${on ? st.bar : T.border}`,
                      background: on ? st.bg : "#fff",
                      boxShadow: on ? `inset 3px 0 0 ${st.bar}` : "none",
                      transition: "all 150ms",
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: st.bar, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: on ? st.text : T.heading }}>{st.label}</span>
                  </button>
                );
              })}
            </div>

            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: T.heading, margin: "20px 0 6px" }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional — staffing, access, engineer visit…"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: T.font, fontSize: 13, padding: "10px 14px", borderRadius: 12, border: `1px solid ${T.border}`, resize: "vertical", outline: "none", color: T.heading }}
            />
          </div>
        </>
      )}

      <div style={{ padding: "16px 22px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
        {locked ? (
          <button
            onClick={onUnlock}
            style={{
              flex: 1, fontFamily: T.font, fontSize: 14, padding: "12px 20px",
              borderRadius: 999, cursor: "pointer", border: `1px solid ${T.crimson}`,
              background: "transparent", color: T.crimson, transition: "all 200ms",
            }}
          >
            Unlock to edit
          </button>
        ) : (
          <>
            <button
              onClick={() => onSave(loc.trim(), status)}
              disabled={!loc.trim()}
              style={{
                flex: 1, fontFamily: T.font, fontSize: 14, fontWeight: 400, padding: "12px 20px",
                borderRadius: 999, cursor: loc.trim() ? "pointer" : "not-allowed",
                border: `1px solid ${T.blue}`, background: T.blue, color: "#fff",
                opacity: loc.trim() ? 1 : 0.45, transition: "background 200ms",
              }}
            >
              Save booking
            </button>
            {sel.cell?.loc && (
              <button
                onClick={onClear}
                style={{ fontFamily: T.font, fontSize: 14, padding: "12px 18px", borderRadius: 999, cursor: "pointer", border: `1px solid ${T.crimson}`, background: "transparent", color: T.crimson, transition: "all 200ms" }}
              >
                Clear
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

/* ── Main app ─────────────────────────────────────────────────── */
export default function CTForwardPlanner() {
  const [assign, setAssign] = useState(() => {
    const m = {};
    DAYS.forEach((d) => { m[d.date] = { ...d.cells }; });
    return m;
  });
  const [sel, setSel] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState(() => new Set());
  const [anchor, setAnchor] = useState(null); // {date, unitId} for shift-click ranges
  const [drag, setDrag] = useState(null); // { origin:{date,unitId}, preview: Map(key->'ok'|'bad'), valid:bool, moves:[...] }
  const [conflict, setConflict] = useState(null); // { moves, clashes, dDelta, uDelta } awaiting swap/overwrite/cancel
  const [publishDialog, setPublishDialog] = useState(null); // { from, to } while open
  const dragRef = useRef(null);

  /* ── undo / redo history ── */
  const assignRef = useRef(assign);
  useEffect(() => { assignRef.current = assign; }, [assign]);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [histVer, setHistVer] = useState(0); // re-render trigger for button states

  const commit = (label, updater) => {
    pastRef.current = [...pastRef.current.slice(-49), { assign: assignRef.current, label }];
    futureRef.current = [];
    setAssign(updater);
    setHistVer((v) => v + 1);
  };
  const undo = () => {
    const p = pastRef.current;
    if (!p.length) return showToast("Nothing to undo");
    const last = p[p.length - 1];
    pastRef.current = p.slice(0, -1);
    futureRef.current = [...futureRef.current, { assign: assignRef.current, label: last.label }];
    setAssign(last.assign);
    setHistVer((v) => v + 1);
    showToast(`Undone — ${last.label}`);
  };
  const redo = () => {
    const f = futureRef.current;
    if (!f.length) return showToast("Nothing to redo");
    const next = f[f.length - 1];
    futureRef.current = f.slice(0, -1);
    pastRef.current = [...pastRef.current, { assign: assignRef.current, label: next.label }];
    setAssign(next.assign);
    setHistVer((v) => v + 1);
    showToast(`Redone — ${next.label}`);
  };

  const dateIdx = useMemo(() => {
    const m = {};
    DAYS.forEach((d, i) => (m[d.date] = i));
    return m;
  }, []);
  const unitIdx = useMemo(() => {
    const m = {};
    UNITS.forEach((u, i) => (m[u.id] = i));
    return m;
  }, []);

  const visibleUnits = useMemo(() => {
    if (!search) return UNITS;
    const q = search.toLowerCase();
    return UNITS.filter((u) => {
      if (u.id.toLowerCase().includes(q) || (u.desc || "").toLowerCase().includes(q)) return true;
      return DAYS.some((d) => {
        const c = assign[d.date]?.[u.id];
        return c?.loc && c.loc.toLowerCase().includes(q);
      });
    });
  }, [search, assign]);

  const availByDate = useMemo(() => {
    const out = {};
    DAYS.forEach((d) => {
      let free = 0;
      UNITS.forEach((u) => {
        const c = assign[d.date]?.[u.id];
        if (!c || !c.loc || c.s === "bidding") free += 1;
      });
      out[d.date] = free;
    });
    return out;
  }, [assign]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  /* ── selection ── */
  const toggleCheck = (date, unitId) => {
    const k = key(date, unitId);
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
    setAnchor({ date, unitId });
  };
  const rangeCheck = (date, unitId) => {
    if (!anchor || anchor.unitId !== unitId) return toggleCheck(date, unitId);
    const a = dateIdx[anchor.date], b = dateIdx[date];
    const [lo, hi] = a < b ? [a, b] : [b, a];
    setChecked((prev) => {
      const next = new Set(prev);
      for (let i = lo; i <= hi; i++) {
        const d = DAYS[i].date;
        const c = assign[d]?.[unitId];
        if (c?.loc && !c.published) next.add(key(d, unitId));
      }
      return next;
    });
  };
  const clearSelection = () => { setChecked(new Set()); setAnchor(null); };

  const handleCellClick = (e, d, u, c) => {
    if (c?.published) return setSel({ date: d.date, unitId: u.id, cell: c }); // locked — view/unlock only
    // Clicking an already-selected booking always unselects it — no modifier needed.
    if (c?.loc && checked.has(key(d.date, u.id))) return toggleCheck(d.date, u.id);
    if (e.shiftKey && c?.loc) return rangeCheck(d.date, u.id);
    if ((e.ctrlKey || e.metaKey || selectMode) && c?.loc) return toggleCheck(d.date, u.id);
    setSel({ date: d.date, unitId: u.id, cell: c });
  };

  /* ── drag & drop ── */
  const startDrag = (e, d, u) => {
    const k = key(d.date, u.id);
    let set = checked;
    if (!checked.has(k)) {
      set = new Set([k]);
      setChecked(set);
    }
    const origin = { date: d.date, unitId: u.id };
    dragRef.current = { origin, keys: [...set] };
    setDrag({ origin, preview: new Map(), valid: false });
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", "quest-move"); } catch {}
  };

  const computePreview = useCallback((targetDate, targetUnitId) => {
    const st = dragRef.current;
    if (!st) return null;
    const dDelta = dateIdx[targetDate] - dateIdx[st.origin.date];
    const uDelta = unitIdx[targetUnitId] - unitIdx[st.origin.unitId];
    const moving = new Set(st.keys);
    const preview = new Map();
    const moves = [];
    const clashes = [];
    let oob = false;
    for (const k of st.keys) {
      const [srcDate, srcUnit] = k.split("|");
      const di = dateIdx[srcDate] + dDelta;
      const ui = unitIdx[srcUnit] + uDelta;
      if (di < 0 || di >= DAYS.length || ui < 0 || ui >= UNITS.length) { oob = true; continue; }
      const tDate = DAYS[di].date, tUnit = UNITS[ui].id;
      const tKey = key(tDate, tUnit);
      const occupant = assign[tDate]?.[tUnit];
      const occupied = !!occupant?.loc && !moving.has(tKey);
      preview.set(tKey, occupied ? "bad" : "ok");
      if (occupied) clashes.push({ date: tDate, unitId: tUnit, cell: occupant });
      moves.push({ from: { date: srcDate, unitId: srcUnit }, to: { date: tDate, unitId: tUnit } });
    }
    const valid = !oob && clashes.length === 0;
    return { preview, valid, moves, clashes, oob, dDelta, uDelta };
  }, [assign, dateIdx, unitIdx]);

  const onCellDragOver = (e, d, u) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const res = computePreview(d.date, u.id);
    if (!res) return;
    e.dataTransfer.dropEffect = res.valid ? "move" : "none";
    setDrag((prev) => {
      if (prev && prev.target === key(d.date, u.id)) return prev;
      return { origin: dragRef.current.origin, target: key(d.date, u.id), ...res };
    });
  };

  const applyMove = (moves, mode) => {
    const movingKeys = new Set(moves.map((m) => key(m.from.date, m.from.unitId)));
    const n = moves.length;
    const label = mode === "swap" ? `swapped ${n} booking${n > 1 ? "s" : ""}` : `moved ${n} booking${n > 1 ? "s" : ""}`;
    commit(label, (prev) => {
      const next = {};
      for (const dt of Object.keys(prev)) next[dt] = { ...prev[dt] };
      const payload = moves.map((m) => ({ to: m.to, cell: next[m.from.date][m.from.unitId] }));
      const swaps =
        mode === "swap"
          ? moves
              .filter((m) => next[m.to.date]?.[m.to.unitId]?.loc && !movingKeys.has(key(m.to.date, m.to.unitId)))
              .map((m) => ({ to: m.from, cell: next[m.to.date][m.to.unitId] }))
          : [];
      moves.forEach((m) => { delete next[m.from.date][m.from.unitId]; });
      payload.forEach((p) => { next[p.to.date][p.to.unitId] = p.cell; });
      swaps.forEach((p) => { next[p.to.date][p.to.unitId] = p.cell; });
      return next;
    });
    return label;
  };

  const onCellDrop = (e, d, u) => {
    e.preventDefault();
    const res = computePreview(d.date, u.id);
    endDrag();
    if (!res || (res.dDelta === 0 && res.uDelta === 0)) return;
    if (res.oob) {
      showToast("Can't move there — part of the selection would fall outside the planner range");
      return;
    }
    if (res.clashes.length > 0) {
      setConflict(res); // hand over to the dialog
      return;
    }
    applyMove(res.moves, "move");
    const dayWord = Math.abs(res.dDelta) === 1 ? "day" : "days";
    const parts = [];
    if (res.dDelta) parts.push(`${res.dDelta > 0 ? "+" : ""}${res.dDelta} ${dayWord}`);
    if (res.uDelta) parts.push("different unit");
    showToast(`Moved ${res.moves.length} booking${res.moves.length > 1 ? "s" : ""} ${parts.length ? "(" + parts.join(", ") + ")" : ""}`);
    clearSelection();
  };

  const resolveConflict = (mode) => {
    if (!conflict) return;
    if (mode === "cancel") { setConflict(null); return; }
    const label = applyMove(conflict.moves, mode);
    showToast(mode === "swap" ? `Swapped — ${conflict.clashes.length} booking${conflict.clashes.length > 1 ? "s" : ""} exchanged` : `Overwritten — ${label}`);
    setConflict(null);
    clearSelection();
  };

  const endDrag = () => { dragRef.current = null; setDrag(null); };

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea";
      if (e.key === "Escape") { clearSelection(); setSel(null); endDrag(); setConflict(null); setPublishDialog(null); return; }
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && (e.key === "z" || e.key === "Z")) { e.preventDefault(); undo(); }
      else if ((mod && e.shiftKey && (e.key === "z" || e.key === "Z")) || (mod && (e.key === "y" || e.key === "Y"))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── drawer save/clear ── */
  const save = (loc, status) => {
    commit(`booking on ${sel.unitId}, ${fmtDate(sel.date)}`, (prev) => ({
      ...prev,
      [sel.date]: { ...prev[sel.date], [sel.unitId]: { loc, s: status } },
    }));
    showToast(`Saved — ${sel.unitId} · ${loc}`);
    setSel(null);
  };
  const clear = () => {
    commit(`cleared ${sel.unitId}, ${fmtDate(sel.date)}`, (prev) => {
      const day = { ...prev[sel.date] };
      delete day[sel.unitId];
      return { ...prev, [sel.date]: day };
    });
    showToast(`Cleared — ${sel.unitId} on ${fmtDate(sel.date)}`);
    setSel(null);
  };

  /* ── publish / lock ── */
  const eligibleInRange = (from, to) => {
    const out = [];
    DAYS.forEach((d) => {
      if (!inRange(d.date, from, to)) return;
      UNITS.forEach((u) => {
        const c = assign[d.date]?.[u.id];
        if (c?.loc && !c.published) out.push({ date: d.date, unitId: u.id });
      });
    });
    return out;
  };

  const publishTargets = (targets, label) => {
    if (!targets.length) { showToast("Nothing to publish — all selected bookings are already published"); return; }
    commit(label, (prev) => {
      const next = {};
      for (const dt of Object.keys(prev)) next[dt] = { ...prev[dt] };
      targets.forEach((t) => { next[t.date][t.unitId] = { ...next[t.date][t.unitId], published: true }; });
      return next;
    });
    showToast(`Published ${targets.length} booking${targets.length > 1 ? "s" : ""} to TMS`);
  };

  const publishSelected = () => {
    const targets = [...checked].map((k) => { const [date, unitId] = k.split("|"); return { date, unitId }; })
      .filter((t) => assign[t.date]?.[t.unitId]?.loc && !assign[t.date][t.unitId].published);
    publishTargets(targets, `published ${targets.length} selected booking${targets.length > 1 ? "s" : ""}`);
    clearSelection();
  };

  const confirmPublishRange = () => {
    if (!publishDialog) return;
    const targets = eligibleInRange(publishDialog.from, publishDialog.to);
    publishTargets(targets, `published ${targets.length} booking${targets.length > 1 ? "s" : ""} (${fmtDate(publishDialog.from)} – ${fmtDate(publishDialog.to)})`);
    setPublishDialog(null);
  };

  const unlock = () => {
    commit(`unlocked ${sel.unitId}, ${fmtDate(sel.date)}`, (prev) => ({
      ...prev,
      [sel.date]: { ...prev[sel.date], [sel.unitId]: { ...prev[sel.date][sel.unitId], published: false } },
    }));
    showToast(`Unlocked — ${sel.unitId} on ${fmtDate(sel.date)} is editable again`);
    setSel(null);
  };

  const range = `${fmtDate(DAYS[0].date)} – ${fmtDate(DAYS[DAYS.length - 1].date)} 2025`;
  const nChecked = checked.size;

  return (
    <div style={{ fontFamily: T.font, background: T.surfaceAlt, height: "100vh", display: "flex", flexDirection: "column", color: T.body }}>
      {/* ── App bar ── */}
      <header style={{ background: T.navy, padding: "0 24px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 10px rgba(26,61,105,0.25)" }}>
        <QuestLockup />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>CT fleet · {UNITS.length} units</span>
          <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, background: "rgba(255,255,255,0.12)", padding: "6px 14px", borderRadius: 999 }}>{range}</span>
          <div style={{ width: 32, height: 32, borderRadius: 99, background: T.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500 }}>OM</div>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units or sites…"
          style={{ fontFamily: T.font, fontSize: 13, padding: "8px 16px", borderRadius: 999, border: `1px solid ${T.border}`, outline: "none", width: 200, color: T.heading }}
          onFocus={(e) => (e.target.style.borderColor = T.blue)}
          onBlur={(e) => (e.target.style.borderColor = T.border)}
        />
        <span style={{ width: 1, height: 24, background: T.border }} />
        <Pill active={!statusFilter} onClick={() => setStatusFilter(null)}>All statuses</Pill>
        {["confirmed", "likely", "tbc", "bidding", "service", "cancelled"].map((k) => (
          <Pill key={k} active={statusFilter === k} onClick={() => setStatusFilter(statusFilter === k ? null : k)} dot={STATUSES[k].bar}>
            {STATUSES[k].label.split(" — ")[0].split(" / ")[0]}
          </Pill>
        ))}
        <span style={{ flex: 1 }} />
        <div style={{ display: "inline-flex", gap: 4 }}>
          <button
            onClick={undo}
            disabled={pastRef.current.length === 0}
            title="Undo (Ctrl/Cmd + Z)"
            style={{
              fontFamily: T.font, fontSize: 13, padding: "7px 14px", borderRadius: "999px 0 0 999px",
              border: `1px solid ${T.border}`, background: "#fff", cursor: pastRef.current.length ? "pointer" : "not-allowed",
              color: pastRef.current.length ? T.heading : "#c5c9d1", display: "inline-flex", alignItems: "center", gap: 6,
              transition: "color 200ms",
            }}
          >
            <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>↺</span> Undo
          </button>
          <button
            onClick={redo}
            disabled={futureRef.current.length === 0}
            title="Redo (Ctrl/Cmd + Shift + Z, or Ctrl + Y)"
            style={{
              fontFamily: T.font, fontSize: 13, padding: "7px 14px", borderRadius: "0 999px 999px 0",
              border: `1px solid ${T.border}`, marginLeft: -1, background: "#fff", cursor: futureRef.current.length ? "pointer" : "not-allowed",
              color: futureRef.current.length ? T.heading : "#c5c9d1", display: "inline-flex", alignItems: "center", gap: 6,
              transition: "color 200ms",
            }}
          >
            Redo <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>↻</span>
          </button>
        </div>
        <span style={{ width: 1, height: 24, background: T.border }} />
        <Pill active={selectMode} onClick={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }} tone="navy">
          {selectMode ? "Selecting…" : "Select"}
        </Pill>
        <button
          onClick={() => setPublishDialog({ from: DAYS[0].date, to: DAYS[DAYS.length - 1].date })}
          style={{
            fontFamily: T.font, fontSize: 13, padding: "7px 16px", borderRadius: 999,
            border: `1px solid ${T.navy}`, background: T.navy, color: "#fff", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          🔒 Publish upcoming…
        </button>
        <Pill active={showLegend} onClick={() => setShowLegend(!showLegend)}>Key</Pill>
      </div>

      {/* ── Selection bar ── */}
      {nChecked > 0 && (
        <div style={{ background: T.navyDark, color: "#fff", padding: "9px 24px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>{nChecked} booking{nChecked > 1 ? "s" : ""} selected</span>
          <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 300 }}>
            Drag to move the whole set — green means free; red means a clash and you'll be asked to swap or overwrite. Click a selected booking to unselect it.
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={publishSelected} style={{ fontFamily: T.font, fontSize: 12, padding: "5px 14px", borderRadius: 999, border: "1px solid #fff", background: "#fff", color: T.navyDark, cursor: "pointer", fontWeight: 500 }}>
            🔒 Publish selected
          </button>
          <button onClick={clearSelection} style={{ fontFamily: T.font, fontSize: 12, padding: "5px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", cursor: "pointer" }}>
            Clear selection (Esc)
          </button>
        </div>
      )}

      {showLegend && (
        <div style={{ background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "10px 24px", display: "flex", gap: 18, flexWrap: "wrap", flexShrink: 0 }}>
          {STATUS_ORDER.map((k) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: T.heading }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: STATUSES[k].bg, border: `1.5px solid ${tintBorder(STATUSES[k].bar, k === "confirmed" ? 0.35 : 0.55)}` }} />
              {STATUSES[k].label}
            </span>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: T.heading }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, border: `1px dashed ${T.border}` }} />
            Available day
          </span>
        </div>
      )}

      {/* ── Grid + drawer ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content" }}>
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky", top: 0, left: 0, zIndex: 30, background: T.surfaceAlt,
                    borderBottom: `2px solid ${T.navy}`, borderRight: `1px solid ${T.border}`,
                    padding: "10px 14px", textAlign: "left", minWidth: 190, fontFamily: T.font,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.navy }}>Date</div>
                  <div style={{ fontSize: 10, fontWeight: 400, color: T.muted, marginTop: 2 }}>Units available</div>
                </th>
                {visibleUnits.map((u) => (
                  <th
                    key={u.id}
                    title={u.desc}
                    style={{
                      position: "sticky", top: 0, zIndex: 20, background: T.surfaceAlt,
                      borderBottom: `2px solid ${T.navy}`, borderRight: `1px solid ${T.surfaceAlt}`,
                      padding: "8px 8px", minWidth: 132, maxWidth: 132, textAlign: "left", cursor: "default",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{u.id}</div>
                    <div style={{ fontSize: 10, fontWeight: 300, color: T.muted, lineHeight: "12px", height: 24, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginTop: 2 }}>
                      {u.desc}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => {
                const isWknd = d.dow === "Sat" || d.dow === "Sun";
                const isMon = d.dow === "Mon";
                return (
                  <tr key={d.date}>
                    <td
                      style={{
                        position: "sticky", left: 0, zIndex: 10,
                        background: isWknd ? "#f1f3f7" : T.surfaceAlt,
                        borderRight: `1px solid ${T.border}`,
                        borderBottom: `1px solid ${T.border}`,
                        borderTop: isMon ? `2px solid #cdd6e2` : "none",
                        padding: "6px 14px", minWidth: 190, verticalAlign: "middle",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: isWknd ? "#6a7488" : T.heading, fontVariantNumeric: "tabular-nums" }}>{fmtDate(d.date)}</span>
                        <span style={{ fontSize: 11, fontWeight: 400, color: T.muted }}>{DOW_FULL[d.dow]}</span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <AvailBar free={availByDate[d.date]} total={UNITS.length} />
                      </div>
                    </td>
                    {visibleUnits.map((u) => {
                      const c = assign[d.date]?.[u.id];
                      const k = key(d.date, u.id);
                      const dim = statusFilter && !(c && c.s === statusFilter);
                      const isSel = sel && sel.date === d.date && sel.unitId === u.id;
                      const preview = drag?.preview?.get(k) || null;
                      return (
                        <td
                          key={u.id}
                          onDragOver={(e) => onCellDragOver(e, d, u)}
                          onDrop={(e) => onCellDrop(e, d, u)}
                          style={{
                            borderBottom: `1px solid ${T.surfaceAlt}`,
                            borderTop: isMon ? `2px solid #e4e9f0` : "none",
                            background: isWknd ? "#fafbfd" : "#fff",
                            padding: "3px 3px", minWidth: 132, maxWidth: 132,
                            opacity: dim && !preview ? 0.22 : 1, transition: "opacity 200ms",
                          }}
                        >
                          <CellChip
                            cell={c}
                            selected={isSel}
                            checked={checked.has(k)}
                            preview={preview}
                            draggable={!!c?.loc}
                            onDragStart={(e) => startDrag(e, d, u)}
                            onDragEnd={endDrag}
                            onClick={(e) => handleCellClick(e, d, u, c)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sel && (
          <Drawer
            sel={{ ...sel, cell: assign[sel.date]?.[sel.unitId] }}
            units={UNITS}
            sites={SITES}
            onClose={() => setSel(null)}
            onSave={save}
            onClear={clear}
            onUnlock={unlock}
          />
        )}
      </div>

      {/* ── Publish range dialog ── */}
      {publishDialog && (
        <div
          onClick={() => setPublishDialog(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(26,61,105,0.45)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "100%", boxShadow: "0 20px 60px rgba(26,61,105,0.35)", fontFamily: T.font, overflow: "hidden" }}
          >
            <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: T.navy }}>Publish to TMS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.heading, marginTop: 4 }}>Lock a date range for forwarding</div>
              <div style={{ fontSize: 13, color: T.body, marginTop: 4, fontWeight: 300 }}>
                Every confirmed booking in this range gets locked and marked ready for TMS. Already-published bookings are left as they are.
              </div>
            </div>

            <div style={{ padding: "18px 24px", display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.heading, marginBottom: 5 }}>From</label>
                <select
                  value={publishDialog.from}
                  onChange={(e) => setPublishDialog((p) => ({ ...p, from: e.target.value }))}
                  style={{ width: "100%", fontFamily: T.font, fontSize: 13, padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.border}`, color: T.heading }}
                >
                  {DAYS.map((d) => <option key={d.date} value={d.date}>{fmtDate(d.date)} ({d.dow})</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.heading, marginBottom: 5 }}>To</label>
                <select
                  value={publishDialog.to}
                  onChange={(e) => setPublishDialog((p) => ({ ...p, to: e.target.value }))}
                  style={{ width: "100%", fontFamily: T.font, fontSize: 13, padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.border}`, color: T.heading }}
                >
                  {DAYS.map((d) => <option key={d.date} value={d.date}>{fmtDate(d.date)} ({d.dow})</option>)}
                </select>
              </div>
            </div>

            <div style={{ padding: "0 24px 10px" }}>
              <div style={{ fontSize: 13, color: T.heading, background: T.surfaceAlt, borderRadius: 10, padding: "10px 14px" }}>
                {publishDialog.from > publishDialog.to
                  ? "Pick a 'From' date on or before 'To'."
                  : (() => {
                      const n = eligibleInRange(publishDialog.from, publishDialog.to).length;
                      return n === 0
                        ? "No unpublished bookings fall in this range."
                        : `This will publish ${n} booking${n > 1 ? "s" : ""} to TMS.`;
                    })()}
              </div>
            </div>

            <div style={{ padding: "14px 24px 20px", display: "flex", gap: 10 }}>
              <button
                onClick={confirmPublishRange}
                disabled={publishDialog.from > publishDialog.to || eligibleInRange(publishDialog.from, publishDialog.to).length === 0}
                style={{
                  flex: 1, fontFamily: T.font, fontSize: 14, padding: "12px 18px", borderRadius: 999,
                  cursor: "pointer", border: `1px solid ${T.navy}`, background: T.navy, color: "#fff",
                  opacity: (publishDialog.from > publishDialog.to || eligibleInRange(publishDialog.from, publishDialog.to).length === 0) ? 0.4 : 1,
                }}
              >
                🔒 Publish range
              </button>
              <button
                onClick={() => setPublishDialog(null)}
                style={{ minWidth: 90, fontFamily: T.font, fontSize: 14, padding: "12px 18px", borderRadius: 999, cursor: "pointer", border: `1px solid ${T.border}`, background: "#fff", color: T.heading }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conflict dialog ── */}
      {conflict && (
        <div
          onClick={() => resolveConflict("cancel")}
          style={{
            position: "fixed", inset: 0, background: "rgba(26,61,105,0.45)", zIndex: 90,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              background: "#fff", borderRadius: 16, width: 480, maxWidth: "100%",
              boxShadow: "0 20px 60px rgba(26,61,105,0.35)", fontFamily: T.font, overflow: "hidden",
            }}
          >
            <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: T.crimson }}>
                Booking clash
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.heading, marginTop: 4 }}>
                {conflict.clashes.length === 1
                  ? "The target slot already has a booking"
                  : `${conflict.clashes.length} of the target slots already have bookings`}
              </div>
              <div style={{ fontSize: 13, color: T.body, marginTop: 4, fontWeight: 300 }}>
                Choose what happens to the existing booking{conflict.clashes.length > 1 ? "s" : ""}. Either choice can be undone (Ctrl/Cmd + Z).
              </div>
            </div>

            <div style={{ padding: "12px 24px", maxHeight: 180, overflowY: "auto" }}>
              {conflict.clashes.slice(0, 5).map((cl) => {
                const st = STATUSES[cl.cell.s] || STATUSES.confirmed;
                return (
                  <div key={key(cl.date, cl.unitId)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${T.surfaceAlt}` }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: st.bar, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.heading, minWidth: 52 }}>{cl.unitId}</span>
                    <span style={{ fontSize: 13, color: T.body, minWidth: 58 }}>{fmtDate(cl.date)}</span>
                    <span style={{ fontSize: 13, color: T.heading, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.cell.loc}</span>
                  </div>
                );
              })}
              {conflict.clashes.length > 5 && (
                <div style={{ fontSize: 12, color: T.muted, padding: "8px 0" }}>…and {conflict.clashes.length - 5} more</div>
              )}
            </div>

            <div style={{ padding: "14px 24px 20px", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => resolveConflict("swap")}
                style={{
                  flex: 1, minWidth: 140, fontFamily: T.font, fontSize: 14, padding: "12px 18px",
                  borderRadius: 999, cursor: "pointer", border: `1px solid ${T.blue}`,
                  background: T.blue, color: "#fff", transition: "background 200ms",
                }}
              >
                ⇄ Swap bookings
              </button>
              <button
                onClick={() => resolveConflict("overwrite")}
                title="Replaces the existing bookings — they will be removed"
                style={{
                  flex: 1, minWidth: 120, fontFamily: T.font, fontSize: 14, padding: "12px 18px",
                  borderRadius: 999, cursor: "pointer", border: `1px solid ${T.crimson}`,
                  background: "transparent", color: T.crimson, transition: "all 200ms",
                }}
              >
                Overwrite
              </button>
              <button
                onClick={() => resolveConflict("cancel")}
                style={{
                  minWidth: 90, fontFamily: T.font, fontSize: 14, padding: "12px 18px",
                  borderRadius: 999, cursor: "pointer", border: `1px solid ${T.border}`,
                  background: "#fff", color: T.heading, transition: "all 200ms",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: T.navyDark, color: "#fff", fontFamily: T.font, fontSize: 13,
            padding: "11px 22px", borderRadius: 999, boxShadow: "0 8px 24px rgba(26,61,105,0.35)",
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
