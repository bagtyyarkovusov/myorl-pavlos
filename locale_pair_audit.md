# Locale Pair Audit

Deterministic audit for the MODX -> Strapi migration. Starts from `transformed_resources.json` and `full_ready_check.py` strict-pair output, then evaluates every unlinked page for a likely translation partner before injection.

## Summary

- Strict self-consistent pairs: **123**
- Greek pages without a strict partner: **70**
  - Pointing to a missing Russian id: **10**
  - Truly unlinked candidates: **60**
- Russian pages without a strict partner: **26**
  - Pointing to a missing Greek id: **6**
  - Truly unlinked candidates: **20**

### Proposal buckets

| Side | Auto-link | Needs review | Truly unlocalized |
| --- | ---: | ---: | ---: |
| Greek (web) orphans | 3 | 13 | 44 |
| Russian (rus) orphans | 3 | 10 | 7 |

### Cross-collisions (ambiguities)

Two or more orphans picked the same partner as their top-1 candidate. These must be resolved before any auto-linking.

| Side | Target | Claimants |
| --- | --- | --- |
| Greek (web) | Russian (rus) 387 | 11, 80 |
| Greek (web) | Russian (rus) 238 | 363, 364 |
| Greek (web) | Russian (rus) 337 | 62, 413 |
| Greek (web) | Russian (rus) 326 | 57, 403 |
| Russian (rus) | Greek (web) 129 | 262, 336 |

## Broken Babel references

Rows that already claim a translation partner in the opposite context, but whose target id does not exist in the dataset. These are almost certainly mis-linked, not truly orphan, and the rewrite should overwrite the dead id with a live candidate from this audit.

### Greek rows pointing at missing Russian ids

| web id | alias | title | dead rus target | current babel |
| ---: | --- | --- | ---: | --- |
| 6 | `plastiki-aisthitiki-prosopou` | Πλαστική προσώπου | 283 | rus:283; web:6 |
| 54 | `endoskopiki-facelift-browlift` | Ανύψωση φρυδιών και μετώπου | 280 | rus:280; web:54 |
| 57 | `facelift` | Λίφτινγκ προσώπου (Face Lift) | 294 | rus:294; web:57 |
| 58 | `vlefaroplastiki` | Βλεφαροπλαστική - Πλαστική βλεφάρων | 292 | rus:292; web:58 |
| 61 | `otoplastiki` | Ωτοπλαστική | 290 | rus:290; web:61 |
| 62 | `diorthosi-loviou-aytiou` | Διόρθωση λοβίου αυτιού -  Σκισμένα λοβία | 295 | rus:295; web:62 |
| 63 | `silhouette-soft` | Silhouette Soft | 296 | rus:296; web:63 |
| 129 | `syxnes-erwtiseis-apantiseis-2` | Συχνές ερωτήσεις - Απαντήσεις για ωτοπλαστική | 291 | rus:291; web:129 |
| 144 | `plirofories-gia-asfalismenous-edoeap-kai-trapeza-tis-ellados` | Πληροφορίες για ασφαλισμένους ΕΔΟΕΑΠ και Τράπεζας της Ελλάδος | 208 | rus:208; web:144 |
| 403 | `lftynnk-prospou-2` | Λίφτινγκ προσώπου 2 | 403 | rus:403 |

### Russian rows pointing at missing Greek ids

| rus id | alias | title | dead web target | current babel |
| ---: | --- | --- | ---: | --- |
| 238 | `ypognathios-adenas` | Подчелюстная железа | 35 | rus:238; web:35 |
| 256 | `amygdales-adenoeideis-ekvlastiseis` | Аденоиды, гланды, храп, апноэ сна | 40 | rus:256; web:40 |
| 257 | `amygdales` | Миндалины ("гланды") | 108 | rus:257; web:108 |
| 262 | `syxnes-erwtiseis-apantiseis` | FAQ - вопросы и ответы | 114 | rus:262; web:114 |
| 298 | `fillers` | Филлеры | 65 | rus:298; web:65 |
| 335 | `plasticheskaia-xeirourgia-otoplastika` | Отопластика | 335 | web:335 |

## Greek orphans with proposed Russian partners

### Auto-linkable (reciprocal top-1, score ≥ 70)

- **web 54** `endoskopiki-facelift-browlift` — Ανύψωση φρυδιών και μετώπου (parent 6, tpl 8, current babel: rus:280; web:54)
  1. rus **325** `endoskopiki-facelift-browlift` — Подтяжка бровей - Подтяжка лба (parent 323, tpl 8) — score **105** — alias exact match; shared asset paths: ['uploads/browlift_1_dc2c3868f6.jpg', 'uploads/face_endoscopic_facelift_22a9ddf7af.jpg', 'uploads/img2_b93c52f66e.png']; same template

- **web 63** `silhouette-soft` — Silhouette Soft (parent 6, tpl 8, current babel: rus:296; web:63)
  1. rus **338** `silhouette-soft-afini` — Силуэт Софт (parent 323, tpl 8) — score **96** — alias tokens nearly identical (1.00); shared asset paths: ['uploads/before_after_fd603c89b8.png', 'uploads/img2_3be7d17f47.jpg', 'uploads/img3_eb8ace6c07.jpg']; same template; title token partial overlap (0.33)

- **web 364** `ypognathios-adenas` — Αφαίρεση υπογνάθιου αδένα (parent 363, tpl 18, current babel: web:364)
  1. rus **238** `ypognathios-adenas` — Подчелюстная железа (parent 212, tpl 8) — score **100** — alias exact match; shared asset paths: ['uploads/img1_3ccdbc7113.jpg', 'uploads/img2_d7517d6551.jpg', 'uploads/img6_a4d1684441.jpg']

### Needs human review (score ≥ 25)

- **web 11** `sitemap` — Sitemap (parent 0, tpl 0, current babel: web:11)
  1. rus **387** `sitemap` — Карта сайта (parent 0, tpl 12) — score **60** — alias exact match

- **web 57** `facelift` — Λίφτινγκ προσώπου (Face Lift) (parent 6, tpl 8, current babel: rus:294; web:57)
  1. rus **326** `facelifting` — Подтяжка лица - Фейслифтинг (parent 323, tpl 8) — score **30** — shared asset paths: ['uploads/1a_e868810a1f.jpg']; same template
  2. rus **325** `endoskopiki-facelift-browlift` — Подтяжка бровей - Подтяжка лба (parent 323, tpl 8) — score **15** — alias tokens partially overlap (0.33); same template

- **web 58** `vlefaroplastiki` — Βλεφαροπλαστική - Πλαστική βλεφάρων (parent 378, tpl 18, current babel: rus:292; web:58)
  1. rus **327** `blefaroplastika-v-athinah` — Блефаропластика (parent 380, tpl 18) — score **45** — shared asset paths: ['uploads/upper_eyelid_surgery_758aec88f9.jpg', 'uploads/vlefarolastiki_2efb91784b.png', 'uploads/vlefaroplastiki_1_e660b6c24f.jpg']; same template

- **web 62** `diorthosi-loviou-aytiou` — Διόρθωση λοβίου αυτιού -  Σκισμένα λοβία (parent 6, tpl 8, current babel: rus:295; web:62)
  1. rus **337** `ear-lobe-repair` — Реконструкция мочки уха (parent 323, tpl 8) — score **45** — shared asset paths: ['uploads/diortosi_loviou_autiou_2_320aae8206.jpg', 'uploads/diortosi_loviou_autiou_3_d36c7c41f9.jpg', 'uploads/diortosi_loviou_autiou_4_b183078594.jpg']; same template

- **web 80** `sitemap` — Sitemap (parent 0, tpl 12, current babel: web:80)
  1. rus **387** `sitemap` — Карта сайта (parent 0, tpl 12) — score **65** — alias exact match; same template

- **web 128** `otoplastiki-1` — Ωτοπλαστική (parent 61, tpl 18, current babel: web:128)
  1. rus **335** `plasticheskaia-xeirourgia-otoplastika` — Отопластика (parent 334, tpl 18) — score **45** — shared asset paths: ['uploads/otoplastiki_epemvasi_1_31648a69bb.jpg', 'uploads/otoplastiki_epemvasi_1da52e26e0.jpg', 'uploads/otoplastiki_epemvasi_3_3d8201721a.jpg']; same template

- **web 129** `syxnes-erwtiseis-apantiseis-2` — Συχνές ερωτήσεις - Απαντήσεις για ωτοπλαστική (parent 61, tpl 18, current babel: rus:291; web:129)
  1. rus **262** `syxnes-erwtiseis-apantiseis` — FAQ - вопросы и ответы (parent 256, tpl 18) — score **60** — alias tokens nearly identical (1.00); alias Levenshtein 2; same template
  2. rus **336** `voprosi-otvei-otoplastika` — Ответы на часто задаваемые вопросы по отопластике (parent 334, tpl 18) — score **45** — shared asset paths: ['uploads/otoplas3iki_2_edf490ac03.jpg', 'uploads/otoplastiki_1_fcafa71c5e.jpg', 'uploads/otoplastiki_4_388da295bd.jpg']; same template

- **web 358** `otoplastiki-xwris-tomi` — Ωτοπλαστική χωρίς τομή (parent 61, tpl 18, current babel: web:358)
  1. rus **373** `novaia-otoplastika-bez-razrezov` — Новая отопластика без разрезов (parent 334, tpl 18) — score **45** — shared asset paths: ['uploads/1prin_meta_11408dba55.png', 'uploads/2prin_meta_abc60f1140.png', 'uploads/otoplastiki_xwis_tomes_2d0c21d5ea.png']; same template

- **web 363** `parotida-ypognathios-adenas` — Παρωτίδα και υπογνάθιος αδένας (parent 3, tpl 20, current babel: web:363)
  1. rus **238** `ypognathios-adenas` — Подчелюстная железа (parent 212, tpl 8) — score **45** — alias tokens overlap (0.67); parent is in a known strict pair

- **web 377** `vlefaroplastiki-laser` — Βλεφαροπλαστική με λέιζερ (parent 378, tpl 8, current babel: web:377)
  1. rus **381** `лазерная-блефаропластика` — Лазерная блефаропластика (parent 380, tpl 8) — score **45** — shared asset paths: ['uploads/blepharoplasty_plexr2_3782c582c5.jpg', 'uploads/vlefaroplastiki_laser_1_3bcf317ed6.png', 'uploads/vlefaroplastiki_laser_2_9dfb973134.png']; same template

- **web 402** `anorthosi-laimou` — Ανόρθωση λαιμού και πηγουνιού (Νeck Lifting) (parent 6, tpl 8, current babel: web:402)
  1. rus **398** `necklift` — Пластика шеи и подбородка (parent 323, tpl 8) — score **45** — shared asset paths: ['uploads/necklift_1_09197eae3e.jpg', 'uploads/necklift_2_64daac92c1.jpg', 'uploads/necklift_3_7656d016b8.jpg']; same template

- **web 403** `lftynnk-prospou-2` — Λίφτινγκ προσώπου 2 (parent 6, tpl 8, current babel: rus:403)
  1. rus **326** `facelifting` — Подтяжка лица - Фейслифтинг (parent 323, tpl 8) — score **30** — shared asset paths: ['uploads/1a_e868810a1f.jpg']; same template

- **web 413** `meiosi-lovion` — Μείωση λοβίων (parent 6, tpl 8, current babel: web:413)
  1. rus **337** `ear-lobe-repair` — Реконструкция мочки уха (parent 323, tpl 8) — score **45** — shared asset paths: ['uploads/diortosi_loviou_autiou_1_efd9a4201b.jpg', 'uploads/meiotiki_loviou_otos_1_dddce667d1.jpg', 'uploads/meiotiki_loviou_otos_2_c5dcf96a91.jpg']; same template

### Truly unlocalized (no credible candidate)

- **web 6** `plastiki-aisthitiki-prosopou` — Πλαστική προσώπου (parent 0, tpl 7, current babel: rus:283; web:6)
  - No rus candidate in the current dataset.

- **web 18** `xronia-otitida` — Χρόνια ωτίτιδα (parent 3, tpl 8, current babel: web:18)
  - No rus candidate in the current dataset.

- **web 61** `otoplastiki` — Ωτοπλαστική (parent 6, tpl 20, current babel: rus:290; web:61)
  - No rus candidate in the current dataset.

- **web 101** `ru-page` — Ru (parent 0, tpl 15, current babel: web:101)
  - No rus candidate in the current dataset.

- **web 144** `plirofories-gia-asfalismenous-edoeap-kai-trapeza-tis-ellados` — Πληροφορίες για ασφαλισμένους ΕΔΟΕΑΠ και Τράπεζας της Ελλάδος (parent 1, tpl 8, current babel: rus:208; web:144)
  - No rus candidate in the current dataset.

- **web 319** `thilomata-spiloi` — Θηλώματα (parent 6, tpl 8, current babel: web:319)
  - No rus candidate in the current dataset.

- **web 321** `xiloeidi-auti` — Χηλοειδή αυτιών (parent 6, tpl 8, current babel: web:321)
  - No rus candidate in the current dataset.

- **web 359** `osteoma-kraniou` — Οστέωμα και λίπωμα κρανίου (parent 6, tpl 8, current babel: web:359)
  - No rus candidate in the current dataset.

- **web 360** `neognikos-elenxos-akois-otoakoustikes-ekpompes` — Νεογνικός Έλεγχος Ακοής - Ωτοακουστικές Εκπομπές (parent 76, tpl 8, current babel: web:360)
  - No rus candidate in the current dataset.

- **web 362** `pathiseis-sielogonon-adenon` — Παθήσεις σιελογόνων αδένων (parent 363, tpl 18, current babel: web:362)
  - No rus candidate in the current dataset.

- **web 365** `ogkoi-sielogonon-adenon` — Όγκοι των σιελογόνων αδένων (parent 363, tpl 18, current babel: web:365)
  - No rus candidate in the current dataset.

- **web 366** `katagma-mitis` — Κάταγμα μύτης (ρινός) (parent 3, tpl 8, current babel: web:366)
  - No rus candidate in the current dataset.

- **web 367** `yposmia` — Υποσμία (parent 3, tpl 8, current babel: web:367)
  - No rus candidate in the current dataset.

- **web 368** `trypa-sto-tympano` — Διάτρηση τυμπανικής μεμβράνης (parent 3, tpl 8, current babel: web:368)
  - No rus candidate in the current dataset.

- **web 369** `test-osfrisis` — Τεστ όσφρησης (parent 76, tpl 8, current babel: web:369)
  - No rus candidate in the current dataset.

- **web 370** `otosklirinsi` — Ωτοσκλήρυνση (parent 3, tpl 8, current babel: web:370)
  - No rus candidate in the current dataset.

- **web 371** `thyreoplasty` — Θυρεοπλαστική (parent 3, tpl 8, current babel: web:371)
  - No rus candidate in the current dataset.

- **web 374** `syndromo-adeias-mytis` — Σύνδρομο άδειας μύτης (parent 3, tpl 8, current babel: web:374)
  - No rus candidate in the current dataset.

- **web 375** `syndromo-eagle` — Σύνδρομο Eagle (parent 3, tpl 8, current babel: web:375)
  - No rus candidate in the current dataset.

- **web 376** `pankolpitida` — Πανκολπίτιδα (parent 3, tpl 8, current babel: web:376)
  - No rus candidate in the current dataset.

- **web 378** `blepharoplasty` — Βλεφαροπλαστική (parent 6, tpl 20, current babel: web:378)
  - No rus candidate in the current dataset.

- **web 379** `karkinos-sto-auti` — Όγκοι του ωτικού πτερυγίου (parent 3, tpl 8, current babel: web:379)
  - No rus candidate in the current dataset.

- **web 382** `typet` — ΤΥΠΕΤ (parent 77, tpl 11, current babel: web:382)
  - No rus candidate in the current dataset.

- **web 383** `iaso-paidwn` — ΙΑΣΩ Παίδων (parent 77, tpl 11, current babel: web:383)
  - No rus candidate in the current dataset.

- **web 384** `euroclinc` — Ευρωκλινική Αθηνών (parent 77, tpl 11, current babel: web:384)
  - No rus candidate in the current dataset.

- **web 385** `euroclinic-paidon` — Ευρωκλινική Παίδων (parent 77, tpl 11, current babel: web:385)
  - No rus candidate in the current dataset.

- **web 386** `bioclinic-athinwn` — Βιοκλινική Αθηνών (parent 77, tpl 11, current babel: web:386)
  - No rus candidate in the current dataset.

- **web 388** `mikitoma-igmoreiou` — Μυκήτωμα ιγμορείου (parent 3, tpl 8, current babel: web:388)
  - No rus candidate in the current dataset.

- **web 389** `endoskopiki-kryoxeirourgiki` — Ενδοσκοπική κρυοχειρουργική (parent 5, tpl 8, current babel: web:389)
  1. rus **325** `endoskopiki-facelift-browlift` — Подтяжка бровей - Подтяжка лба (parent 323, tpl 8) — score **15** — alias tokens partially overlap (0.25); same template

- **web 390** `anastrofo-thiloma` — Ανάστροφο θήλωμα (parent 5, tpl 8, current babel: web:390)
  - No rus candidate in the current dataset.

- **web 391** `rinofima` — Ρινόφυμα (parent 3, tpl 8, current babel: web:391)
  - No rus candidate in the current dataset.

- **web 392** `preauricular-cyst` — Προωτιαίο συρίγγιο (parent 3, tpl 8, current babel: web:392)
  - No rus candidate in the current dataset.

- **web 393** `lipoma` — Λίπωμα (parent 3, tpl 8, current babel: web:393)
  - No rus candidate in the current dataset.

- **web 394** `spiloi-prosopou` — Σπίλοι προσώπου (parent 6, tpl 8, current babel: web:394)
  - No rus candidate in the current dataset.

- **web 395** `roxalito-kai-apnoia` — Ροχαλητό και άπνοια (parent 3, tpl 20, current babel: web:395)
  - No rus candidate in the current dataset.

- **web 396** `kakosmia-stomatos` — Κακοσμία στόματος (parent 3, tpl 8, current babel: web:396)
  - No rus candidate in the current dataset.

- **web 397** `rinoplastiki-piezotome` — Ρινοπλαστική με Piezotome (parent 59, tpl 18, current babel: web:397)
  - No rus candidate in the current dataset.

- **web 404** `concha-bullosa` — Φυσαλιδώδης κόγχη - Concha bullosa (parent 5, tpl 8, current babel: web:404)
  - No rus candidate in the current dataset.

- **web 405** `afairesi-oulis-prosopou` — Αφαίρεση ουλής προσώπου (parent 6, tpl 8, current babel: web:405)
  - No rus candidate in the current dataset.

- **web 406** `rendu-osler-weber` — Κληρονομική αιμορραγική τηλαγγειεκτασία (parent 3, tpl 8, current babel: web:406)
  - No rus candidate in the current dataset.

- **web 407** `smigmatogonos-kysti` — Σμηγματογόνος κύστη (parent 3, tpl 8, current babel: web:407)
  - No rus candidate in the current dataset.

- **web 408** `trachiostomia` — Τραχειοστομία  - Σύγκλιση τραχειοστομίας (parent 3, tpl 8, current babel: web:408)
  - No rus candidate in the current dataset.

- **web 409** `atrisia` — Ατρησία ρινικής χοάνης (parent 3, tpl 8, current babel: web:409)
  - No rus candidate in the current dataset.

- **web 414** `xeno-soma-igmoreio` — Ξένο σώμα στο ιγμόρειο άντρο (parent 5, tpl 8, current babel: web:414)
  - No rus candidate in the current dataset.

## Russian orphans with proposed Greek partners

### Auto-linkable (reciprocal top-1, score ≥ 70)

- **rus 238** `ypognathios-adenas` — Подчелюстная железа (parent 212, tpl 8, current babel: rus:238; web:35)
  1. web **364** `ypognathios-adenas` — Αφαίρεση υπογνάθιου αδένα (parent 363, tpl 18) — score **100** — alias exact match; shared asset paths: ['uploads/img1_3ccdbc7113.jpg', 'uploads/img2_d7517d6551.jpg', 'uploads/img6_a4d1684441.jpg']
  2. web **363** `parotida-ypognathios-adenas` — Παρωτίδα και υπογνάθιος αδένας (parent 3, tpl 20) — score **45** — alias tokens overlap (0.67); parent is in a known strict pair

- **rus 325** `endoskopiki-facelift-browlift` — Подтяжка бровей - Подтяжка лба (parent 323, tpl 8, current babel: rus:325)
  1. web **54** `endoskopiki-facelift-browlift` — Ανύψωση φρυδιών και μετώπου (parent 6, tpl 8) — score **105** — alias exact match; shared asset paths: ['uploads/browlift_1_dc2c3868f6.jpg', 'uploads/face_endoscopic_facelift_22a9ddf7af.jpg', 'uploads/img2_b93c52f66e.png']; same template
  2. web **389** `endoskopiki-kryoxeirourgiki` — Ενδοσκοπική κρυοχειρουργική (parent 5, tpl 8) — score **15** — alias tokens partially overlap (0.25); same template
  3. web **57** `facelift` — Λίφτινγκ προσώπου (Face Lift) (parent 6, tpl 8) — score **15** — alias tokens partially overlap (0.33); same template

- **rus 338** `silhouette-soft-afini` — Силуэт Софт (parent 323, tpl 8, current babel: rus:338)
  1. web **63** `silhouette-soft` — Silhouette Soft (parent 6, tpl 8) — score **96** — alias tokens nearly identical (1.00); shared asset paths: ['uploads/before_after_fd603c89b8.png', 'uploads/img2_3be7d17f47.jpg', 'uploads/img3_eb8ace6c07.jpg']; same template; title token partial overlap (0.33)

### Needs human review (score ≥ 25)

- **rus 262** `syxnes-erwtiseis-apantiseis` — FAQ - вопросы и ответы (parent 256, tpl 18, current babel: rus:262; web:114)
  1. web **129** `syxnes-erwtiseis-apantiseis-2` — Συχνές ερωτήσεις - Απαντήσεις για ωτοπλαστική (parent 61, tpl 18) — score **60** — alias tokens nearly identical (1.00); alias Levenshtein 2; same template

- **rus 326** `facelifting` — Подтяжка лица - Фейслифтинг (parent 323, tpl 8, current babel: rus:326)
  1. web **57** `facelift` — Λίφτινγκ προσώπου (Face Lift) (parent 6, tpl 8) — score **30** — shared asset paths: ['uploads/1a_e868810a1f.jpg']; same template
  2. web **403** `lftynnk-prospou-2` — Λίφτινγκ προσώπου 2 (parent 6, tpl 8) — score **30** — shared asset paths: ['uploads/1a_e868810a1f.jpg']; same template

- **rus 327** `blefaroplastika-v-athinah` — Блефаропластика (parent 380, tpl 18, current babel: rus:327)
  1. web **58** `vlefaroplastiki` — Βλεφαροπλαστική - Πλαστική βλεφάρων (parent 378, tpl 18) — score **45** — shared asset paths: ['uploads/upper_eyelid_surgery_758aec88f9.jpg', 'uploads/vlefarolastiki_2efb91784b.png', 'uploads/vlefaroplastiki_1_e660b6c24f.jpg']; same template

- **rus 335** `plasticheskaia-xeirourgia-otoplastika` — Отопластика (parent 334, tpl 18, current babel: web:335)
  1. web **128** `otoplastiki-1` — Ωτοπλαστική (parent 61, tpl 18) — score **45** — shared asset paths: ['uploads/otoplastiki_epemvasi_1_31648a69bb.jpg', 'uploads/otoplastiki_epemvasi_1da52e26e0.jpg', 'uploads/otoplastiki_epemvasi_3_3d8201721a.jpg']; same template

- **rus 336** `voprosi-otvei-otoplastika` — Ответы на часто задаваемые вопросы по отопластике (parent 334, tpl 18, current babel: rus:336)
  1. web **129** `syxnes-erwtiseis-apantiseis-2` — Συχνές ερωτήσεις - Απαντήσεις για ωτοπλαστική (parent 61, tpl 18) — score **45** — shared asset paths: ['uploads/otoplas3iki_2_edf490ac03.jpg', 'uploads/otoplastiki_1_fcafa71c5e.jpg', 'uploads/otoplastiki_4_388da295bd.jpg']; same template

- **rus 337** `ear-lobe-repair` — Реконструкция мочки уха (parent 323, tpl 8, current babel: rus:337)
  1. web **413** `meiosi-lovion` — Μείωση λοβίων (parent 6, tpl 8) — score **45** — shared asset paths: ['uploads/diortosi_loviou_autiou_1_efd9a4201b.jpg', 'uploads/meiotiki_loviou_otos_1_dddce667d1.jpg', 'uploads/meiotiki_loviou_otos_2_c5dcf96a91.jpg']; same template
  2. web **62** `diorthosi-loviou-aytiou` — Διόρθωση λοβίου αυτιού -  Σκισμένα λοβία (parent 6, tpl 8) — score **45** — shared asset paths: ['uploads/diortosi_loviou_autiou_2_320aae8206.jpg', 'uploads/diortosi_loviou_autiou_3_d36c7c41f9.jpg', 'uploads/diortosi_loviou_autiou_4_b183078594.jpg']; same template

- **rus 373** `novaia-otoplastika-bez-razrezov` — Новая отопластика без разрезов (parent 334, tpl 18, current babel: rus:373)
  1. web **358** `otoplastiki-xwris-tomi` — Ωτοπλαστική χωρίς τομή (parent 61, tpl 18) — score **45** — shared asset paths: ['uploads/1prin_meta_11408dba55.png', 'uploads/2prin_meta_abc60f1140.png', 'uploads/otoplastiki_xwis_tomes_2d0c21d5ea.png']; same template

- **rus 381** `лазерная-блефаропластика` — Лазерная блефаропластика (parent 380, tpl 8, current babel: rus:381)
  1. web **377** `vlefaroplastiki-laser` — Βλεφαροπλαστική με λέιζερ (parent 378, tpl 8) — score **45** — shared asset paths: ['uploads/blepharoplasty_plexr2_3782c582c5.jpg', 'uploads/vlefaroplastiki_laser_1_3bcf317ed6.png', 'uploads/vlefaroplastiki_laser_2_9dfb973134.png']; same template

- **rus 387** `sitemap` — Карта сайта (parent 0, tpl 12, current babel: rus:387)
  1. web **80** `sitemap` — Sitemap (parent 0, tpl 12) — score **65** — alias exact match; same template
  2. web **11** `sitemap` — Sitemap (parent 0, tpl 0) — score **60** — alias exact match

- **rus 398** `necklift` — Пластика шеи и подбородка (parent 323, tpl 8, current babel: rus:398)
  1. web **402** `anorthosi-laimou` — Ανόρθωση λαιμού και πηγουνιού (Νeck Lifting) (parent 6, tpl 8) — score **45** — shared asset paths: ['uploads/necklift_1_09197eae3e.jpg', 'uploads/necklift_2_64daac92c1.jpg', 'uploads/necklift_3_7656d016b8.jpg']; same template

### Truly unlocalized (no credible candidate)

- **rus 256** `amygdales-adenoeideis-ekvlastiseis` — Аденоиды, гланды, храп, апноэ сна (parent 255, tpl 20, current babel: rus:256; web:40)
  - No web candidate in the current dataset.

- **rus 257** `amygdales` — Миндалины ("гланды") (parent 256, tpl 18, current babel: rus:257; web:108)
  - No web candidate in the current dataset.

- **rus 298** `fillers` — Филлеры (parent 323, tpl 8, current babel: rus:298; web:65)
  - No web candidate in the current dataset.

- **rus 323** `пластика-лица` — Пластика лица (parent 0, tpl 7, current babel: rus:323)
  - No web candidate in the current dataset.

- **rus 334** `otoplastika-v-athinah` — Отопластика (parent 323, tpl 20, current babel: rus:334)
  - No web candidate in the current dataset.

- **rus 348** `botulinotherapia-ru` — Ботулинотерапия (parent 323, tpl 8, current babel: rus:348)
  - No web candidate in the current dataset.

- **rus 380** `блефаропластика-пластика-глаз` — Блефаропластика - Пластика глаз (parent 323, tpl 20, current babel: rus:380)
  - No web candidate in the current dataset.

## How to use this audit

1. Treat every row in **Broken Babel references** as a mis-link. The importer must **not** honor those dead ids; instead consult the per-row candidate below to pick the real partner.
2. **Auto-linkable** entries can be adopted by the importer without manual input: both sides reciprocate each other as top-1 and the top score is above the auto threshold (signals usually include an exact alias, a shared image path, or both).
3. **Needs review** requires human confirmation before it becomes a locale link. Check the candidate list, pick the right one, and record the decision back into the Babel normalization table.
4. **Truly unlocalized** rows are safe to import as standalone locale documents (no `documentId` attachment).
5. Re-run this script after editing Babel TVs in MODX (or an equivalent normalization table) to confirm the orphan list shrinks.

