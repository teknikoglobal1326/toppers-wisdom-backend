const XLSX = require('xlsx');
const path = require('path');

const data = [];
const subjects = [
    {
        name: 'Mathematics',
        chapters: [
            {
                name: 'Algebra',
                topics: [
                    {
                        name: 'Linear Equations',
                        questions: [
                            {
                                en: { q: 'Solve for x: 2x + 3 = 7', opt1: '1', opt2: '2', opt3: '3', opt4: '4', exp: '2x = 4, x = 2' },
                                hi: { q: 'x के लिए हल करें: 2x + 3 = 7', opt1: '1', opt2: '2', opt3: '3', opt4: '4', exp: '2x = 4, x = 2' },
                                ans: 2
                            },
                            {
                                en: { q: 'Solve for y: 5y - 2 = 13', opt1: '2', opt2: '3', opt3: '4', opt4: '5', exp: '5y = 15, y = 3' },
                                hi: { q: 'y के लिए हल करें: 5y - 2 = 13', opt1: '2', opt2: '3', opt3: '4', opt4: '5', exp: '5y = 15, y = 3' },
                                ans: 2
                            },
                            {
                                en: { q: 'If x + 5 = 12, what is x?', opt1: '5', opt2: '6', opt3: '7', opt4: '8', exp: 'x = 12 - 5 = 7' },
                                hi: { q: 'यदि x + 5 = 12 है, तो x क्या है?', opt1: '5', opt2: '6', opt3: '7', opt4: '8', exp: 'x = 12 - 5 = 7' },
                                ans: 3
                            }
                        ]
                    },
                    {
                        name: 'Quadratic Equations',
                        questions: [
                            {
                                en: { q: 'What is the sum of roots for x^2 - 5x + 6 = 0?', opt1: '5', opt2: '-5', opt3: '6', opt4: '-6', exp: 'Sum = -b/a = 5' },
                                hi: { q: 'x^2 - 5x + 6 = 0 के मूलों का योग क्या है?', opt1: '5', opt2: '-5', opt3: '6', opt4: '-6', exp: 'योग = -b/a = 5' },
                                ans: 1
                            },
                            {
                                en: { q: 'What is the product of roots for x^2 - 5x + 6 = 0?', opt1: '5', opt2: '-5', opt3: '6', opt4: '-6', exp: 'Product = c/a = 6' },
                                hi: { q: 'x^2 - 5x + 6 = 0 के मूलों का गुणनफल क्या है?', opt1: '5', opt2: '-5', opt3: '6', opt4: '-6', exp: 'गुणनफल = c/a = 6' },
                                ans: 3
                            },
                            {
                                en: { q: 'Solve: x^2 = 16', opt1: '4', opt2: '-4', opt3: '4, -4', opt4: 'None', exp: 'x = ±4' },
                                hi: { q: 'हल करें: x^2 = 16', opt1: '4', opt2: '-4', opt3: '4, -4', opt4: 'कोई नहीं', exp: 'x = ±4' },
                                ans: 3
                            }
                        ]
                    }
                ]
            },
            {
                name: 'Geometry',
                topics: [
                    {
                        name: 'Triangles',
                        questions: [
                            {
                                en: { q: 'Sum of angles in a triangle is?', opt1: '90', opt2: '180', opt3: '360', opt4: '270', exp: 'Sum is always 180 degrees' },
                                hi: { q: 'त्रिभुज के कोणों का योग क्या होता है?', opt1: '90', opt2: '180', opt3: '360', opt4: '270', exp: 'योग हमेशा 180 डिग्री होता है' },
                                ans: 2
                            },
                            {
                                en: { q: 'In a right triangle, hypotenuse squared equals?', opt1: 'sum of other two sides', opt2: 'sum of squares of other two sides', opt3: 'difference of other two sides', opt4: 'none of these', exp: 'Pythagoras theorem' },
                                hi: { q: 'एक समकोण त्रिभुज में, कर्ण का वर्ग किसके बराबर होता है?', opt1: 'अन्य दो भुजाओं का योग', opt2: 'अन्य दो भुजाओं के वर्गों का योग', opt3: 'अन्य दो भुजाओं का अंतर', opt4: 'इनमें से कोई नहीं', exp: 'पाइथागोरस प्रमेय' },
                                ans: 2
                            },
                            {
                                en: { q: 'An equilateral triangle has all angles equal to?', opt1: '45', opt2: '60', opt3: '90', opt4: '120', exp: '180/3 = 60 degrees' },
                                hi: { q: 'एक समबाहु त्रिभुज के सभी कोण किसके बराबर होते हैं?', opt1: '45', opt2: '60', opt3: '90', opt4: '120', exp: '180/3 = 60 डिग्री' },
                                ans: 2
                            }
                        ]
                    },
                    {
                        name: 'Circles',
                        questions: [
                            {
                                en: { q: 'What is the formula for area of a circle?', opt1: 'πr', opt2: '2πr', opt3: 'πr^2', opt4: '2πr^2', exp: 'Area is πr^2' },
                                hi: { q: 'वृत्त के क्षेत्रफल का सूत्र क्या है?', opt1: 'πr', opt2: '2πr', opt3: 'πr^2', opt4: '2πr^2', exp: 'क्षेत्रफल πr^2 है' },
                                ans: 3
                            },
                            {
                                en: { q: 'What is the longest chord of a circle?', opt1: 'Radius', opt2: 'Diameter', opt3: 'Secant', opt4: 'Tangent', exp: 'Diameter passes through center' },
                                hi: { q: 'वृत्त की सबसे लंबी जीवा क्या है?', opt1: 'त्रिज्या', opt2: 'व्यास', opt3: 'छेदक रेखा', opt4: 'स्पर्श रेखा', exp: 'व्यास केंद्र से होकर गुजरता है' },
                                ans: 2
                            },
                            {
                                en: { q: 'The angle subtended by a semicircle at the circumference is?', opt1: '45', opt2: '60', opt3: '90', opt4: '180', exp: 'Angle in a semicircle is 90 degrees' },
                                hi: { q: 'एक अर्धवृत्त द्वारा परिधि पर अंतरित कोण क्या है?', opt1: '45', opt2: '60', opt3: '90', opt4: '180', exp: 'अर्धवृत्त में कोण 90 डिग्री होता है' },
                                ans: 3
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        name: 'Physics',
        chapters: [
            {
                name: 'Mechanics',
                topics: [
                    {
                        name: 'Motion',
                        questions: [
                            {
                                en: { q: 'Rate of change of displacement is?', opt1: 'Speed', opt2: 'Velocity', opt3: 'Acceleration', opt4: 'Distance', exp: 'Velocity is rate of change of displacement' },
                                hi: { q: 'विस्थापन में परिवर्तन की दर क्या है?', opt1: 'चाल', opt2: 'वेग', opt3: 'त्वरण', opt4: 'दूरी', exp: 'वेग विस्थापन में परिवर्तन की दर है' },
                                ans: 2
                            },
                            {
                                en: { q: 'Rate of change of velocity is?', opt1: 'Speed', opt2: 'Displacement', opt3: 'Acceleration', opt4: 'Force', exp: 'Acceleration = dv/dt' },
                                hi: { q: 'वेग में परिवर्तन की दर क्या है?', opt1: 'चाल', opt2: 'विस्थापन', opt3: 'त्वरण', opt4: 'बल', exp: 'त्वरण = dv/dt' },
                                ans: 3
                            },
                            {
                                en: { q: 'Area under velocity-time graph gives?', opt1: 'Acceleration', opt2: 'Displacement', opt3: 'Speed', opt4: 'Force', exp: 'Area under v-t graph is displacement' },
                                hi: { q: 'वेग-समय ग्राफ के अंतर्गत क्षेत्र क्या देता है?', opt1: 'त्वरण', opt2: 'विस्थापन', opt3: 'चाल', opt4: 'बल', exp: 'v-t ग्राफ के अंतर्गत क्षेत्र विस्थापन है' },
                                ans: 2
                            }
                        ]
                    },
                    {
                        name: 'Laws of Motion',
                        questions: [
                            {
                                en: { q: 'Force equals mass times?', opt1: 'Velocity', opt2: 'Speed', opt3: 'Acceleration', opt4: 'Displacement', exp: 'F = ma (Newton second law)' },
                                hi: { q: 'बल किसके बराबर होता है द्रव्यमान गुणा?', opt1: 'वेग', opt2: 'चाल', opt3: 'त्वरण', opt4: 'विस्थापन', exp: 'F = ma (न्यूटन का दूसरा नियम)' },
                                ans: 3
                            },
                            {
                                en: { q: 'Which law is known as Law of Inertia?', opt1: 'First Law', opt2: 'Second Law', opt3: 'Third Law', opt4: 'Law of Gravitation', exp: 'Newton first law is law of inertia' },
                                hi: { q: 'किस नियम को जड़त्व का नियम कहा जाता है?', opt1: 'पहला नियम', opt2: 'दूसरा नियम', opt3: 'तीसरा नियम', opt4: 'गुरुत्वाकर्षण का नियम', exp: 'न्यूटन का पहला नियम जड़त्व का नियम है' },
                                ans: 1
                            },
                            {
                                en: { q: 'For every action there is an equal and opposite reaction. Which law is this?', opt1: 'First Law', opt2: 'Second Law', opt3: 'Third Law', opt4: 'Fourth Law', exp: 'Newton third law' },
                                hi: { q: 'प्रत्येक क्रिया के बराबर और विपरीत प्रतिक्रिया होती है। यह कौन सा नियम है?', opt1: 'पहला नियम', opt2: 'दूसरा नियम', opt3: 'तीसरा नियम', opt4: 'चौथा नियम', exp: 'न्यूटन का तीसरा नियम' },
                                ans: 3
                            }
                        ]
                    }
                ]
            },
            {
                name: 'Electricity',
                topics: [
                    {
                        name: 'Current Electricity',
                        questions: [
                            {
                                en: { q: 'Unit of electric current is?', opt1: 'Volt', opt2: 'Ampere', opt3: 'Ohm', opt4: 'Watt', exp: 'Current is measured in Amperes' },
                                hi: { q: 'विद्युत धारा की इकाई क्या है?', opt1: 'वोल्ट', opt2: 'एम्पीयर', opt3: 'ओम', opt4: 'वाट', exp: 'धारा को एम्पीयर में मापा जाता है' },
                                ans: 2
                            },
                            {
                                en: { q: 'Rate of flow of electric charge is called?', opt1: 'Voltage', opt2: 'Current', opt3: 'Resistance', opt4: 'Power', exp: 'I = q/t' },
                                hi: { q: 'विद्युत आवेश के प्रवाह की दर को क्या कहा जाता है?', opt1: 'वोल्टेज', opt2: 'धारा', opt3: 'प्रतिरोध', opt4: 'शक्ति', exp: 'I = q/t' },
                                ans: 2
                            },
                            {
                                en: { q: 'Which instrument measures electric current?', opt1: 'Voltmeter', opt2: 'Ammeter', opt3: 'Galvanometer', opt4: 'Potentiometer', exp: 'Ammeter measures current' },
                                hi: { q: 'कौन सा उपकरण विद्युत धारा को मापता है?', opt1: 'वोल्टमीटर', opt2: 'एमीटर', opt3: 'गैल्वेनोमीटर', opt4: 'विभवमापी', exp: 'एमीटर धारा को मापता है' },
                                ans: 2
                            }
                        ]
                    },
                    {
                        name: 'Ohm\'s Law',
                        questions: [
                            {
                                en: { q: 'Ohm\'s law states?', opt1: 'V = I/R', opt2: 'V = IR', opt3: 'I = VR', opt4: 'R = VI', exp: 'Voltage = Current * Resistance' },
                                hi: { q: 'ओम का नियम क्या बताता है?', opt1: 'V = I/R', opt2: 'V = IR', opt3: 'I = VR', opt4: 'R = VI', exp: 'वोल्टेज = धारा * प्रतिरोध' },
                                ans: 2
                            },
                            {
                                en: { q: 'Unit of electrical resistance is?', opt1: 'Ampere', opt2: 'Volt', opt3: 'Ohm', opt4: 'Joule', exp: 'Resistance is measured in Ohms' },
                                hi: { q: 'विद्युत प्रतिरोध की इकाई क्या है?', opt1: 'एम्पीयर', opt2: 'वोल्ट', opt3: 'ओम', opt4: 'जूल', exp: 'प्रतिरोध को ओम में मापा जाता है' },
                                ans: 3
                            },
                            {
                                en: { q: 'If voltage is doubled and resistance is constant, current?', opt1: 'Halves', opt2: 'Doubles', opt3: 'Quadruples', opt4: 'Remains same', exp: 'I = V/R, so I is directly proportional to V' },
                                hi: { q: 'यदि वोल्टेज को दोगुना कर दिया जाए और प्रतिरोध स्थिर रहे, तो धारा?', opt1: 'आधी हो जाती है', opt2: 'दोगुनी हो जाती है', opt3: 'चार गुना हो जाती है', opt4: 'समान रहती है', exp: 'I = V/R, इसलिए I सीधे V के समानुपाती है' },
                                ans: 2
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        name: 'Chemistry',
        chapters: [
            {
                name: 'Physical Chemistry',
                topics: [
                    {
                        name: 'Atomic Structure',
                        questions: [
                            {
                                en: { q: 'Who discovered the electron?', opt1: 'Rutherford', opt2: 'Chadwick', opt3: 'J.J. Thomson', opt4: 'Bohr', exp: 'Thomson discovered electron' },
                                hi: { q: 'इलेक्ट्रॉन की खोज किसने की?', opt1: 'रदरफोर्ड', opt2: 'चैडविक', opt3: 'जे.जे. थॉमसन', opt4: 'बोर', exp: 'थॉमसन ने इलेक्ट्रॉन की खोज की' },
                                ans: 3
                            },
                            {
                                en: { q: 'Atomic number is the number of?', opt1: 'Protons', opt2: 'Neutrons', opt3: 'Electrons', opt4: 'Nucleons', exp: 'Atomic number = number of protons' },
                                hi: { q: 'परमाणु क्रमांक किसकी संख्या है?', opt1: 'प्रोटॉन', opt2: 'न्यूट्रॉन', opt3: 'इलेक्ट्रॉन', opt4: 'न्यूक्लियॉन', exp: 'परमाणु क्रमांक = प्रोटॉन की संख्या' },
                                ans: 1
                            },
                            {
                                en: { q: 'Mass number is the sum of?', opt1: 'Protons and Electrons', opt2: 'Protons and Neutrons', opt3: 'Neutrons and Electrons', opt4: 'Only Protons', exp: 'Mass number = protons + neutrons' },
                                hi: { q: 'द्रव्यमान संख्या किसका योग है?', opt1: 'प्रोटॉन और इलेक्ट्रॉन', opt2: 'प्रोटॉन और न्यूट्रॉन', opt3: 'न्यूट्रॉन और इलेक्ट्रॉन', opt4: 'केवल प्रोटॉन', exp: 'द्रव्यमान संख्या = प्रोटॉन + न्यूट्रॉन' },
                                ans: 2
                            }
                        ]
                    },
                    {
                        name: 'Chemical Bonding',
                        questions: [
                            {
                                en: { q: 'Bond formed by sharing of electrons is?', opt1: 'Ionic', opt2: 'Covalent', opt3: 'Metallic', opt4: 'Hydrogen', exp: 'Covalent bond involves sharing' },
                                hi: { q: 'इलेक्ट्रॉनों के साझाकरण से बनने वाला बंध क्या है?', opt1: 'आयनिक', opt2: 'सहसंयोजक', opt3: 'धात्विक', opt4: 'हाइड्रोजन', exp: 'सहसंयोजक बंध में साझाकरण शामिल है' },
                                ans: 2
                            },
                            {
                                en: { q: 'Bond formed by transfer of electrons is?', opt1: 'Ionic', opt2: 'Covalent', opt3: 'Metallic', opt4: 'Hydrogen', exp: 'Ionic bond involves complete transfer' },
                                hi: { q: 'इलेक्ट्रॉनों के स्थानांतरण से बनने वाला बंध क्या है?', opt1: 'आयनिक', opt2: 'सहसंयोजक', opt3: 'धात्विक', opt4: 'हाइड्रोजन', exp: 'आयनिक बंध में पूर्ण स्थानांतरण शामिल है' },
                                ans: 1
                            },
                            {
                                en: { q: 'Which of these is a covalent compound?', opt1: 'NaCl', opt2: 'KCl', opt3: 'H2O', opt4: 'MgCl2', exp: 'H2O has covalent bonds' },
                                hi: { q: 'इनमें से कौन सा एक सहसंयोजक यौगिक है?', opt1: 'NaCl', opt2: 'KCl', opt3: 'H2O', opt4: 'MgCl2', exp: 'H2O में सहसंयोजक बंध होते हैं' },
                                ans: 3
                            }
                        ]
                    }
                ]
            },
            {
                name: 'Organic Chemistry',
                topics: [
                    {
                        name: 'Hydrocarbons',
                        questions: [
                            {
                                en: { q: 'Simplest alkane is?', opt1: 'Ethane', opt2: 'Methane', opt3: 'Propane', opt4: 'Butane', exp: 'Methane (CH4) is simplest' },
                                hi: { q: 'सबसे सरल अल्केन क्या है?', opt1: 'ईथेन', opt2: 'मीथेन', opt3: 'प्रोपेन', opt4: 'ब्यूटेन', exp: 'मीथेन (CH4) सबसे सरल है' },
                                ans: 2
                            },
                            {
                                en: { q: 'General formula of alkanes is?', opt1: 'CnH2n', opt2: 'CnH2n+2', opt3: 'CnH2n-2', opt4: 'CnH2n+1', exp: 'Alkanes are CnH2n+2' },
                                hi: { q: 'अल्केन का सामान्य सूत्र क्या है?', opt1: 'CnH2n', opt2: 'CnH2n+2', opt3: 'CnH2n-2', opt4: 'CnH2n+1', exp: 'अल्केन CnH2n+2 हैं' },
                                ans: 2
                            },
                            {
                                en: { q: 'Alkenes contain at least one?', opt1: 'Single bond', opt2: 'Double bond', opt3: 'Triple bond', opt4: 'Ionic bond', exp: 'Alkenes have C=C double bonds' },
                                hi: { q: 'एल्कीन में कम से कम एक क्या होता है?', opt1: 'एकल बंध', opt2: 'द्विबंध', opt3: 'त्रिबंध', opt4: 'आयनिक बंध', exp: 'एल्कीन में C=C द्विबंध होते हैं' },
                                ans: 2
                            }
                        ]
                    },
                    {
                        name: 'Alcohols and Phenols',
                        questions: [
                            {
                                en: { q: 'Functional group of alcohols is?', opt1: '-CHO', opt2: '-COOH', opt3: '-OH', opt4: '-O-', exp: '-OH is the hydroxyl group' },
                                hi: { q: 'अल्कोहल का कार्यात्मक समूह क्या है?', opt1: '-CHO', opt2: '-COOH', opt3: '-OH', opt4: '-O-', exp: '-OH हाइड्रॉक्सिल समूह है' },
                                ans: 3
                            },
                            {
                                en: { q: 'IUPAC name of ethyl alcohol is?', opt1: 'Methanol', opt2: 'Ethanol', opt3: 'Propanol', opt4: 'Butanol', exp: 'C2H5OH is Ethanol' },
                                hi: { q: 'एथिल अल्कोहल का IUPAC नाम क्या है?', opt1: 'मेथनॉल', opt2: 'इथेनॉल', opt3: 'प्रोपेनॉल', opt4: 'ब्यूटेनॉल', exp: 'C2H5OH इथेनॉल है' },
                                ans: 2
                            },
                            {
                                en: { q: 'Phenol is also known as?', opt1: 'Carbolic acid', opt2: 'Acetic acid', opt3: 'Formic acid', opt4: 'Picric acid', exp: 'Phenol is carbolic acid' },
                                hi: { q: 'फिनोल को और किस नाम से जाना जाता है?', opt1: 'कार्बोलिक एसिड', opt2: 'एसिटिक एसिड', opt3: 'फॉर्मिक एसिड', opt4: 'पिक्रिक एसिड', exp: 'फिनोल कार्बोलिक एसिड है' },
                                ans: 1
                            }
                        ]
                    }
                ]
            }
        ]
    }
];

subjects.forEach(subject => {
    subject.chapters.forEach(chapter => {
        chapter.topics.forEach(topic => {
            topic.questions.forEach(q => {
                data.push({
                    'Subject': subject.name,
                    'Chapter': chapter.name,
                    'Topic': topic.name,
                    'Question': q.en.q,
                    'Option 1': q.en.opt1,
                    'Option 2': q.en.opt2,
                    'Option 3': q.en.opt3,
                    'Option 4': q.en.opt4,
                    'Correct Option': q.ans,
                    'Explanation': q.en.exp,
                    'Question Hi': q.hi.q,
                    'Option 1 Hi': q.hi.opt1,
                    'Option 2 Hi': q.hi.opt2,
                    'Option 3 Hi': q.hi.opt3,
                    'Option 4 Hi': q.hi.opt4,
                    'Explanation Hi': q.hi.exp,
                    'Marks': 1,
                    'Negative Marks': 0,
                    'Difficulty': 'Medium'
                });
            });
        });
    });
});

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

const outputPath = path.join(__dirname, 'pcm_bulk_questions.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log("Successfully generated:", outputPath);
