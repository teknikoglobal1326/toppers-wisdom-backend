/* eslint-disable no-console */
const JSZip = require("jszip");
const { MathMLToLaTeX } = require("mathml-to-latex");
const { DOMParser, XMLSerializer } = require("xmldom");
const xpath = require("xpath");
const path = require("path");
const sharp = require("sharp");
const cheerio = require("cheerio");
const mammoth = require("mammoth");
const { uploadFile } = require("../../lib/fileUpload");

const MCQ_MARKERS_REGEX =
    /(Question\s*(?:\d+\s*:?|:)|Option\s*[A-D]\s*:?|Choice\s*[A-D]\s*:?|[A-D]\s*\)\s?|[1-4]\s*\.\s?|Correct\s+(?:Option|Answer|Choice)\s*:?|Answer\s*:?|Detailed\s+Explanation\s*:?|Explanation\s*:?|Subject\s*:?|Chapter\s*:?|Topic\s*:?)/gi;

const mathSelect = xpath.useNamespaces({
    m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
    w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    a: "http://schemas.openxmlformats.org/drawingml/2006/main",
    r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    pic: "http://schemas.openxmlformats.org/drawingml/2006/picture",
    wp: "http://schemas.openxmlformats.org/wordprocessingml/2006/wordprocessingDrawing",
});

function _translateOMMLToMathML(oMathNode) {
    const doc = new DOMParser().parseFromString(
        '<math xmlns="http://www.w3.org/1998/Math/MathML"></math>',
    );
    const MathMLRoot = doc.documentElement;

    function mapNode(ommlNode, parent) {
        if (!ommlNode) return;

        if (ommlNode.nodeType === 3) {
            const text = ommlNode.nodeValue;
            if (text && text.trim()) {
                parent.appendChild(doc.createTextNode(text));
            }
            return;
        }

        const ln = ommlNode.localName;
        if (!ln) return;

        switch (ln) {
            case "oMath":
            case "e":
            case "r": {
                const tag = parent.localName === "mtr" ? "mtd" : "mrow";
                const container = doc.createElement(tag);
                parent.appendChild(container);
                Array.from(ommlNode.childNodes).forEach((c) => mapNode(c, container));
                break;
            }
            case "t": {
                const textVal = ommlNode.textContent;
                let tag = "mi";
                if (!isNaN(textVal) && !isNaN(parseFloat(textVal))) {
                    tag = "mn";
                } else if (
                    [
                        "+", "-", "=", "(", ")", "[", "]", "{", "}", "∑", "∫", "∬", "∭", "×", "÷", "±", "∓", "⇒", "⇔", "→", "∞", "∂", "∇", "√", "∝", "≈", "≅", "≡", "≠", "≤", "≥", "≪", "≫", "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Ｍ", "Ν", "Ξ", "ओ", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω"
                    ].includes(textVal.trim())
                ) {
                    tag = "mo";
                }
                const mItem = doc.createElement(tag);
                mItem.appendChild(doc.createTextNode(textVal));
                parent.appendChild(mItem);
                break;
            }
            case "f": {
                const mfrac = doc.createElement("mfrac");
                const type = mathSelect("./m:fPr/m:type/@m:val", ommlNode, true);
                if (type && type.nodeValue === "noBar") {
                    mfrac.setAttribute("linethickness", "0");
                }
                const num = mathSelect("./m:num", ommlNode, true);
                const den = mathSelect("./m:den", ommlNode, true);
                mapNode(num, mfrac);
                mapNode(den, mfrac);
                parent.appendChild(mfrac);
                break;
            }
            case "rad": {
                const deg = mathSelect("./m:deg", ommlNode, true);
                const e = mathSelect("./m:e", ommlNode, true);
                const isSquareRoot = !deg || !deg.textContent || deg.textContent.trim() === "";

                const tag = isSquareRoot ? "msqrt" : "mroot";
                const mRootNode = doc.createElement(tag);
                mapNode(e, mRootNode);
                if (!isSquareRoot) {
                    mapNode(deg, mRootNode);
                }
                parent.appendChild(mRootNode);
                break;
            }
            case "sSup": {
                const msup = doc.createElement("msup");
                const base = mathSelect("./m:e", ommlNode, true);
                const sup = mathSelect("./m:sup", ommlNode, true);
                mapNode(base, msup);
                mapNode(sup, msup);
                parent.appendChild(msup);
                break;
            }
            case "sSub": {
                const msub = doc.createElement("msub");
                const base = mathSelect("./m:e", ommlNode, true);
                const sub = mathSelect("./m:sub", ommlNode, true);
                mapNode(base, msub);
                mapNode(sub, msub);
                parent.appendChild(msub);
                break;
            }
            case "sSubSup": {
                const msubsup = doc.createElement("msubsup");
                const base = mathSelect("./m:e", ommlNode, true);
                const sub = mathSelect("./m:sub", ommlNode, true);
                const sup = mathSelect("./m:sup", ommlNode, true);
                mapNode(base, msubsup);
                mapNode(sub, msubsup);
                mapNode(sup, msubsup);
                parent.appendChild(msubsup);
                break;
            }
            case "nary": {
                const opVal = mathSelect("./m:naryPr/m:chr/@m:val", ommlNode, true);
                const sub = mathSelect("./m:sub", ommlNode, true);
                const sup = mathSelect("./m:sup", ommlNode, true);
                const expr = mathSelect("./m:e", ommlNode, true);

                const hasSub = sub && sub.textContent && sub.textContent.trim().length > 0;
                const hasSup = sup && sup.textContent && sup.textContent.trim().length > 0;

                let container;
                if (hasSub && hasSup) {
                    container = doc.createElement("munderover");
                } else if (hasSub) {
                    container = doc.createElement("msub");
                } else if (hasSup) {
                    container = doc.createElement("msup");
                } else {
                    container = doc.createElement("mrow");
                }

                const mo = doc.createElement("mo");
                mo.appendChild(doc.createTextNode(opVal ? opVal.nodeValue : "∑"));
                container.appendChild(mo);

                if (hasSub) mapNode(sub, container);
                if (hasSup) mapNode(sup, container);

                parent.appendChild(container);
                if (expr) mapNode(expr, parent);
                break;
            }
            case "limLow": {
                const munder = doc.createElement("munder");
                const b = mathSelect("./m:e", ommlNode, true);
                const l = mathSelect("./m:lim", ommlNode, true);
                mapNode(b, munder);
                mapNode(l, munder);
                parent.appendChild(munder);
                break;
            }
            case "limUpp": {
                const mover = doc.createElement("mover");
                const b = mathSelect("./m:e", ommlNode, true);
                const l = mathSelect("./m:lim", ommlNode, true);
                mapNode(b, mover);
                mapNode(l, mover);
                parent.appendChild(mover);
                break;
            }
            case "m": {
                const mtable = doc.createElement("mtable");
                parent.appendChild(mtable);
                Array.from(ommlNode.childNodes).forEach((c) => mapNode(c, mtable));
                break;
            }
            case "mr": {
                const mtr = doc.createElement("mtr");
                parent.appendChild(mtr);
                Array.from(ommlNode.childNodes).forEach((c) => mapNode(c, mtr));
                break;
            }
            case "acc": {
                const mover = doc.createElement("mover");
                mover.setAttribute("accent", "true");
                const b = mathSelect("./m:e", ommlNode, true);
                const accPr = mathSelect("./m:accPr/m:chr/@m:val", ommlNode, true);
                mapNode(b, mover);
                const mo = doc.createElement("mo");
                mo.appendChild(doc.createTextNode(accPr ? accPr.nodeValue : "̂"));
                mover.appendChild(mo);
                parent.appendChild(mover);
                break;
            }
            case "bar": {
                const pos = mathSelect("./m:barPr/m:pos/@m:val", ommlNode, true);
                const tag = pos && pos.nodeValue === "bot" ? "munder" : "mover";
                const mNode = doc.createElement(tag);
                mNode.setAttribute("accent", "true");
                const b = mathSelect("./m:e", ommlNode, true);
                mapNode(b, mNode);
                const mo = doc.createElement("mo");
                mo.appendChild(doc.createTextNode("‾"));
                mNode.appendChild(mo);
                parent.appendChild(mNode);
                break;
            }
            case "groupChr": {
                const pos = mathSelect("./m:groupChrPr/m:pos/@m:val", ommlNode, true);
                const chr = mathSelect("./m:groupChrPr/m:chr/@m:val", ommlNode, true);
                const tag = pos && pos.nodeValue === "top" ? "mover" : "munder";
                const mNode = doc.createElement(tag);
                const b = mathSelect("./m:e", ommlNode, true);
                mapNode(b, mNode);
                const mo = doc.createElement("mo");
                mo.appendChild(doc.createTextNode(chr ? chr.nodeValue : "⏟"));
                mNode.appendChild(mo);
                parent.appendChild(mNode);
                break;
            }
            case "d": {
                const dMrow = doc.createElement("mrow");
                const beg = mathSelect("./m:dPr/m:begChr/@m:val", ommlNode, true);
                const end = mathSelect("./m:dPr/m:endChr/@m:val", ommlNode, true);
                const e = mathSelect("./m:e", ommlNode, true);
                const moBeg = doc.createElement("mo");
                moBeg.appendChild(doc.createTextNode(beg ? beg.nodeValue : "("));
                dMrow.appendChild(moBeg);
                mapNode(e, dMrow);
                const moEnd = doc.createElement("mo");
                moEnd.appendChild(doc.createTextNode(end ? end.nodeValue : ")"));
                dMrow.appendChild(moEnd);
                parent.appendChild(dMrow);
                break;
            }
            default:
                Array.from(ommlNode.childNodes).forEach((c) => mapNode(c, parent));
        }
    }

    const children = mathSelect("./*", oMathNode);
    children.forEach((child) => mapNode(child, MathMLRoot));
    return new XMLSerializer().serializeToString(doc);
}

function _convertMathMLToLatex(mathml) {
    try {
        return MathMLToLaTeX.convert(mathml);
    } catch (error) {
        return "";
    }
}

const _appendContentToMode = (q, mode, content, separator = " ") => {
    if (!q || !mode || !content) return;

    const cleanContent = content.trim();
    if (!cleanContent) return;

    if (mode === "question") {
        const current = (q.questionText || "").trim();
        const joinChar = current ? separator : "";
        q.questionText = current + joinChar + cleanContent;
    } else if (mode === "explanation") {
        const current = (q.explanation || "").trim();
        const joinChar = current ? separator : "";
        q.explanation = current + joinChar + cleanContent;
    } else if (mode === "detailed_explanation") {
        const current = (q.detailedExplanation || "").trim();
        const joinChar = current ? separator : "";
        q.detailedExplanation = current + joinChar + cleanContent;
    } else if (["A", "B", "C", "D"].includes(mode)) {
        const opt = q.options.find((o) => o.key === mode);
        if (opt) {
            const current = (opt.text || "").trim();
            const joinChar = current ? separator : "";
            opt.text = current + joinChar + cleanContent;
        }
    } else if (mode === "subject") {
        q.subjectId = cleanContent;
    } else if (mode === "chapter") {
        q.chapterId = cleanContent;
    } else if (mode === "topic") {
        q.topicId = cleanContent;
    }
};

function _parseQuestionsFromHTML(html) {
    const $ = cheerio.load(html);

    if ($("table").length > 0) {
        const questions = [];
        $("table").each((_, tableDom) => {
            const $table = $(tableDom);
            let enQuestionHtml = "";
            let hiQuestionHtml = "";
            let enOptionsHtml = [];
            let hiOptionsHtml = [];
            let enExplanationHtml = "";
            let hiExplanationHtml = "";
            let correctAnswerStr = "";
            let marksVal = null;
            let negMarksVal = null;
            let perQuestionTimeVal = null;
            let difficultyVal = null;
            let subjectVal = null;
            let chapterVal = null;
            let topicVal = null;
            let seqEnOptions = [];
            let seqHiOptions = [];

            $table.find("tr").each((_, trDom) => {
                const cells = $(trDom).find("td");
                if (cells.length < 2) return;
                const rawKey = $(cells[0]).text().trim().toLowerCase().replace(/[\s_-]+/g, "");
                const valHtml = $(cells[1]).html() || "";

                if (rawKey === "question" || rawKey === "questionen" || rawKey === "questiontext") {
                    enQuestionHtml = valHtml;
                } else if (rawKey === "questionhi" || rawKey === "questionhindi" || rawKey === "questiontexthi") {
                    hiQuestionHtml = valHtml;
                } else if (rawKey === "solution" || rawKey === "solutionen" || rawKey === "explanation" || rawKey === "explanationen") {
                    enExplanationHtml = valHtml;
                } else if (rawKey === "solutionhi" || rawKey === "solutionhindi" || rawKey === "explanationhi" || rawKey === "explanationhindi") {
                    hiExplanationHtml = valHtml;
                } else if (rawKey === "answer" || rawKey === "correctanswer" || rawKey === "correctoption") {
                    correctAnswerStr = $(cells[1]).text().trim();
                } else if (rawKey === "marks" || rawKey === "mark") {
                    marksVal = $(cells[1]).text().trim();
                } else if (rawKey === "negativemarks" || rawKey === "negativemark") {
                    negMarksVal = $(cells[1]).text().trim();
                } else if (rawKey === "perquestiontime" || rawKey === "time" || rawKey === "duration") {
                    perQuestionTimeVal = $(cells[1]).text().trim();
                } else if (rawKey === "difficulty" || rawKey === "difficultylevel" || rawKey === "level") {
                    difficultyVal = $(cells[1]).text().trim();
                } else if (rawKey === "optiona" || rawKey === "option1") {
                    enOptionsHtml.push({ key: "A", html: valHtml });
                } else if (rawKey === "optionb" || rawKey === "option2") {
                    enOptionsHtml.push({ key: "B", html: valHtml });
                } else if (rawKey === "optionc" || rawKey === "option3") {
                    enOptionsHtml.push({ key: "C", html: valHtml });
                } else if (rawKey === "optiond" || rawKey === "option4") {
                    enOptionsHtml.push({ key: "D", html: valHtml });
                } else if (rawKey === "optionahi" || rawKey === "option1hi") {
                    hiOptionsHtml.push({ key: "A", html: valHtml });
                } else if (rawKey === "optionbhi" || rawKey === "option2hi") {
                    hiOptionsHtml.push({ key: "B", html: valHtml });
                } else if (rawKey === "optionchi" || rawKey === "option3hi") {
                    hiOptionsHtml.push({ key: "C", html: valHtml });
                } else if (rawKey === "optiondhi" || rawKey === "option4hi") {
                    hiOptionsHtml.push({ key: "D", html: valHtml });
                } else if (rawKey === "option") {
                    seqEnOptions.push(valHtml);
                } else if (rawKey === "optionhi") {
                    seqHiOptions.push(valHtml);
                } else if (rawKey === "subject" || rawKey === "subjectname" || rawKey === "subjectid") {
                    subjectVal = $(cells[1]).text().trim();
                } else if (rawKey === "chapter" || rawKey === "chaptername" || rawKey === "chapterid") {
                    chapterVal = $(cells[1]).text().trim();
                } else if (rawKey === "topic" || rawKey === "topicname" || rawKey === "topicid") {
                    topicVal = $(cells[1]).text().trim();
                }
            });

            if (!enQuestionHtml && !hiQuestionHtml && seqEnOptions.length === 0 && enOptionsHtml.length === 0) {
                return;
            }

            let correctKey = "";
            const cleanAns = correctAnswerStr.toUpperCase().trim();
            if (["A", "B", "C", "D"].includes(cleanAns)) {
                correctKey = cleanAns;
            } else if (cleanAns === "1" || cleanAns === "A)") {
                correctKey = "A";
            } else if (cleanAns === "2" || cleanAns === "B)") {
                correctKey = "B";
            } else if (cleanAns === "3" || cleanAns === "C)") {
                correctKey = "C";
            } else if (cleanAns === "4" || cleanAns === "D)") {
                correctKey = "D";
            }

            const qParsedEn = extractTextAndImage(enQuestionHtml);
            const qParsedHi = extractTextAndImage(hiQuestionHtml);

            const enQuestionText = qParsedEn.text || qParsedHi.text || "";
            const enQuestionImage = qParsedEn.image || qParsedHi.image || "";
            const hiQuestionText = qParsedHi.text || qParsedEn.text || "";
            const hiQuestionImage = qParsedHi.image || qParsedEn.image || "";

            const optionKeys = ["A", "B", "C", "D"];
            const enOptions = [];
            const hiOptions = [];

            for (let idx = 0; idx < 4; idx++) {
                const key = optionKeys[idx];
                let optEnHtml = "";
                let optHiHtml = "";

                const keyedEn = enOptionsHtml.find(o => o.key === key);
                if (keyedEn) {
                    optEnHtml = keyedEn.html;
                } else if (seqEnOptions[idx] !== undefined) {
                    optEnHtml = seqEnOptions[idx];
                }

                const keyedHi = hiOptionsHtml.find(o => o.key === key);
                if (keyedHi) {
                    optHiHtml = keyedHi.html;
                } else if (seqHiOptions[idx] !== undefined) {
                    optHiHtml = seqHiOptions[idx];
                }

                if (!optEnHtml && optHiHtml) optEnHtml = optHiHtml;
                if (!optHiHtml && optEnHtml) optHiHtml = optEnHtml;

                const parsedEn = extractTextAndImage(optEnHtml);
                const parsedHi = extractTextAndImage(optHiHtml);

                enOptions.push({
                    text: parsedEn.text,
                    image: parsedEn.image,
                    isCorrect: correctKey === key
                });

                hiOptions.push({
                    text: parsedHi.text,
                    image: parsedHi.image,
                    isCorrect: correctKey === key
                });
            }

            const expParsedEn = extractTextAndImage(enExplanationHtml);
            const expParsedHi = extractTextAndImage(hiExplanationHtml);

            const enExpText = expParsedEn.text || expParsedHi.text || "";
            const enExpImage = expParsedEn.image || expParsedHi.image || "";
            const hiExpText = expParsedHi.text || expParsedEn.text || "";
            const hiExpImage = expParsedHi.image || expParsedEn.image || "";

            questions.push({
                isTableFormat: true,
                en: {
                    question: { text: enQuestionText, image: enQuestionImage },
                    options: enOptions,
                    explanation: { text: enExpText, image: enExpImage }
                },
                hi: {
                    question: { text: hiQuestionText, image: hiQuestionImage },
                    options: hiOptions,
                    explanation: { text: hiExpText, image: hiExpImage }
                },
                marks: marksVal,
                negativeMarks: negMarksVal,
                perQuestionTime: perQuestionTimeVal,
                difficulty: difficultyVal,
                subjectId: subjectVal,
                chapterId: chapterVal,
                topicId: topicVal
            });
        });
        return questions;
    }

    const questions = [];
    let currentQuestion = null;
    let mode = null;

    const handleMarkerMatched = (markerText) => {
        const matchedMarker = markerText.toLowerCase().trim();

        if (matchedMarker.includes("question")) {
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            currentQuestion = {
                questionText: "",
                options: [
                    { key: "A", text: "" },
                    { key: "B", text: "" },
                    { key: "C", text: "" },
                    { key: "D", text: "" },
                ],
                explanation: "",
                detailedExplanation: "",
                correctAnswer: "",
            };
            mode = "question";
        } else if (matchedMarker.includes("option a") || matchedMarker.includes("choice a") || matchedMarker.startsWith("a)") || matchedMarker.startsWith("1.")) {
            mode = "A";
        } else if (matchedMarker.includes("option b") || matchedMarker.includes("choice b") || matchedMarker.startsWith("b)") || matchedMarker.startsWith("2.")) {
            mode = "B";
        } else if (matchedMarker.includes("option c") || matchedMarker.includes("choice c") || matchedMarker.startsWith("c)") || matchedMarker.startsWith("3.")) {
            mode = "C";
        } else if (matchedMarker.includes("option d") || matchedMarker.includes("choice d") || matchedMarker.startsWith("d)") || matchedMarker.startsWith("4.")) {
            mode = "D";
        } else if (matchedMarker.includes("correct option") || matchedMarker.includes("correct answer") || matchedMarker.includes("answer:") || matchedMarker.startsWith("answer")) {
            mode = "answer";
        } else if (matchedMarker.includes("detailed explanation")) {
            mode = "detailed_explanation";
        } else if (matchedMarker.includes("explanation")) {
            mode = "explanation";
        } else if (matchedMarker.includes("subject")) {
            mode = "subject";
        } else if (matchedMarker.includes("chapter")) {
            mode = "chapter";
        } else if (matchedMarker.includes("topic")) {
            mode = "topic";
        }
    };

    $("body > *").each((_, blockDom) => {
        const $block = $(blockDom);
        let isFirstInBlock = true;

        $block.contents().each((_, node) => {
            const separator = isFirstInBlock ? "<br/>" : " ";
            if (node.nodeType === 3) {
                const text = node.nodeValue;
                const segments = text.split(MCQ_MARKERS_REGEX);
                segments.forEach((segment) => {
                    if (!segment) return;
                    const markerMatch = segment.match(MCQ_MARKERS_REGEX);
                    if (markerMatch) {
                        handleMarkerMatched(markerMatch[0]);
                        isFirstInBlock = true;
                    } else if (currentQuestion && mode) {
                        if (mode === "answer") {
                            const ansMatch = segment.match(/[A-D]/i);
                            if (ansMatch)
                                currentQuestion.correctAnswer = ansMatch[0].toUpperCase();
                        } else {
                            _appendContentToMode(currentQuestion, mode, segment, separator);
                            isFirstInBlock = false;
                        }
                    }
                });
            } else {
                const $ele = $(node);
                const eleName = node.tagName.toLowerCase();
                if (eleName === "img") {
                    const src = $ele.attr("src");
                    if (src && currentQuestion && mode) {
                        const imgHtml = `<img src="${src}" style="max-width: 100%; height: auto;" />`;
                        _appendContentToMode(currentQuestion, mode, imgHtml, isFirstInBlock ? "<br/>" : " ");
                        isFirstInBlock = false;
                    }
                } else if (eleName === "br") {
                    if (currentQuestion && mode) {
                        _appendContentToMode(currentQuestion, mode, "<br/>", "");
                    }
                } else {
                    const text = $ele.text();
                    if (MCQ_MARKERS_REGEX.test(text)) {
                        const segments = text.split(MCQ_MARKERS_REGEX);
                        segments.forEach((segment) => {
                            if (!segment) return;
                            const markerMatch = segment.match(MCQ_MARKERS_REGEX);
                            if (markerMatch) {
                                handleMarkerMatched(markerMatch[0]);
                                isFirstInBlock = true;
                            } else if (currentQuestion && mode) {
                                _appendContentToMode(currentQuestion, mode, segment, isFirstInBlock ? "<br/>" : " ");
                                isFirstInBlock = false;
                            }
                        });
                    } else if (currentQuestion && mode) {
                        const eleHtml = $.html($ele);
                        _appendContentToMode(currentQuestion, mode, eleHtml, isFirstInBlock ? "<br/>" : " ");
                        isFirstInBlock = false;
                    }
                }
            }
        });
    });

    if (currentQuestion) {
        questions.push(currentQuestion);
    }
    return questions;
}

const parseWordFile = async (fileBuffer) => {
    try {
        const zip = await JSZip.loadAsync(fileBuffer);
        const xmlFile = zip.file("word/document.xml");
        if (!xmlFile) {
            throw new Error("Invalid Word document: word/document.xml missing");
        }
        const xmlContent = await xmlFile.async("text");

        const doc = new DOMParser().parseFromString(xmlContent, "text/xml");
        const mathNodes = mathSelect("//*[local-name()='oMath']", doc);

        const wNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        for (const node of mathNodes) {
            try {
                const mathml = _translateOMMLToMathML(node);
                let latex = _convertMathMLToLatex(mathml);

                if (!latex || latex.trim() === "") {
                    latex = node.textContent || "";
                }

                const placeholder = ` $${latex.trim()}$ `;

                const wr = doc.createElementNS(wNS, "w:r");
                const wt = doc.createElementNS(wNS, "w:t");
                wt.appendChild(doc.createTextNode(placeholder));
                wr.appendChild(wt);

                let targetToReplace = node;
                if (node.parentNode && node.parentNode.localName === "oMathPara") {
                    targetToReplace = node.parentNode;
                }

                if (targetToReplace.parentNode) {
                    targetToReplace.parentNode.replaceChild(wr, targetToReplace);
                }
            } catch (err) {
                console.error("Error transpiling math node:", err);
            }
        }

        try {
            const relsFile = zip.file("word/_rels/document.xml.rels");
            if (relsFile) {
                const relsXml = await relsFile.async("text");
                const relsDoc = new DOMParser().parseFromString(relsXml);
                const relNodes = xpath.select("//*[local-name()='Relationship']", relsDoc);

                const relMap = {};
                for (const rel of relNodes) {
                    const id = rel.getAttribute("Id");
                    const target = rel.getAttribute("Target");
                    if (id && target) {
                        relMap[id] = `word/${target}`;
                    }
                }

                const blips = mathSelect("//a:blip", doc);
                const cropManifest = new Map();
                let cropCounter = 1;

                const relsRoot = relsDoc.documentElement;
                const relNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";

                for (const blip of blips) {
                    const rId = blip.getAttribute("r:embed");
                    const srcRect = mathSelect(".//a:srcRect", blip.parentNode, true);

                    if (rId && relMap[rId]) {
                        const originalPath = relMap[rId];

                        if (!srcRect) continue;

                        const l = parseInt(srcRect.getAttribute("l") || "0");
                        const t = parseInt(srcRect.getAttribute("t") || "0");
                        const r = parseInt(srcRect.getAttribute("r") || "0");
                        const b = parseInt(srcRect.getAttribute("b") || "0");

                        if (l === 0 && t === 0 && r === 0 && b === 0) continue;

                        const cropKey = `${originalPath}_${l}_${t}_${r}_${b}`;
                        let targetRId = cropManifest.get(cropKey);

                        if (!targetRId) {
                            const imgFile = zip.file(originalPath);
                            if (imgFile) {
                                const imgBuffer = await imgFile.async("nodebuffer");
                                try {
                                    const metadata = await sharp(imgBuffer).metadata();
                                    const width = metadata.width;
                                    const height = metadata.height;

                                    if (width && height) {
                                        const lf = l / 100000;
                                        const tf = t / 100000;
                                        const rf = r / 100000;
                                        const bf = b / 100000;

                                        const extractLeft = Math.round(width * lf);
                                        const extractTop = Math.round(height * tf);
                                        const extractWidth = Math.round(width * (1 - lf - rf));
                                        const extractHeight = Math.round(height * (1 - tf - bf));

                                        if (extractWidth > 0 && extractHeight > 0) {
                                            const croppedBuffer = await sharp(imgBuffer)
                                                .extract({
                                                    left: Math.max(0, Math.min(extractLeft, width - 1)),
                                                    top: Math.max(0, Math.min(extractTop, height - 1)),
                                                    width: Math.max(1, Math.min(extractWidth, width - extractLeft)),
                                                    height: Math.max(1, Math.min(extractHeight, height - extractTop)),
                                                })
                                                .toBuffer();

                                            const ext = path.extname(originalPath) || ".png";
                                            const newMediaName = `cropped_${Date.now()}_${cropCounter}${ext}`;
                                            const newMediaPathInsideWord = `media/${newMediaName}`;
                                            const newFullZipPath = `word/${newMediaPathInsideWord}`;
                                            zip.file(newFullZipPath, croppedBuffer);
                                            targetRId = `rId_crop_${Date.now()}_${cropCounter}`;
                                            const newRel = relsDoc.createElementNS(relNamespace, "Relationship");
                                            newRel.setAttribute("Id", targetRId);
                                            newRel.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
                                            newRel.setAttribute("Target", newMediaPathInsideWord);
                                            relsRoot.appendChild(newRel);

                                            cropManifest.set(cropKey, targetRId);
                                            cropCounter++;
                                        }
                                    }
                                } catch (sharpErr) {
                                    console.error(`Error cropping image ${originalPath}:`, sharpErr);
                                }
                            }
                        }

                        if (targetRId) {
                            blip.setAttribute("r:embed", targetRId);
                            if (srcRect.parentNode) {
                                srcRect.parentNode.removeChild(srcRect);
                            }
                        }
                    }
                }
                if (cropCounter > 1) {
                    const updatedRelsXml = new XMLSerializer().serializeToString(relsDoc);
                    zip.file("word/_rels/document.xml.rels", updatedRelsXml);
                }
            }
        } catch (err) {
            console.error("Critical error in multi-crop logic:", err);
        }

        const modifiedXml = new XMLSerializer().serializeToString(doc);

        const options = {
            convertImage: mammoth.images.imgElement(async (image) => {
                try {
                    const base64Image = await image.read("base64");
                    const buffer = Buffer.from(base64Image, "base64");
                    const mime = image.contentType || "image/png";
                    const ext = mime.split("/")[1] || "png";
                    const filename = `question_image_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

                    // Local storage upload
                    const relativeUrl = await uploadFile(buffer, filename, "questions", mime);
                    console.log("Uploaded image: ", relativeUrl);
                    return { src: relativeUrl };
                } catch (e) {
                    console.error("Error in convertImage:", e);
                    throw e;
                }
            }),
        };

        zip.file("word/document.xml", modifiedXml);
        const updatedBuffer = await zip.generateAsync({ type: "nodebuffer" });

        const { value: html } = await mammoth.convertToHtml({ buffer: updatedBuffer }, options);

        return _parseQuestionsFromHTML(html);
    } catch (error) {
        throw new Error("Failed to parse Word document: " + error.message);
    }
};

function extractTextAndImage(htmlString) {
    if (!htmlString) return { text: "", image: "" };

    let $ = cheerio.load(`<div>${htmlString}</div>`, null, false);
    const imgElement = $("img").first();
    let image = "";
    if (imgElement.length) {
        image = imgElement.attr("src") || "";
        imgElement.remove();
    }

    // If no <img> tag was found, check if there is a raw image URL in the text
    if (!image) {
        const textContent = $("div").text().trim();
        const imgUrlRegex = /(https?:\/\/[^\s'"]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp)(?:\?[^\s'"]*)?|https?:\/\/picsum\.photos\/[^\s'"]+)/i;
        const match = textContent.match(imgUrlRegex);
        if (match) {
            image = match[0];
            let rawHtml = $("div").html() || "";
            // Replace the URL with empty string in the html content
            rawHtml = rawHtml.replace(image, "").trim();
            $ = cheerio.load(`<div>${rawHtml}</div>`, null, false);
        }
    }

    // Strip HTML tags, but preserve line breaks
    $("br").replaceWith("\n");
    $("p").each((_, el) => {
        $(el).append("\n");
    });

    let text = $("div").text() || "";
    text = text.trim();

    // Decode leading slash if it's relative
    if (image && !image.startsWith("http") && !image.startsWith("/")) {
        image = "/" + image;
    }

    return { text, image };
}

function mapWordQuestionToSchema(q, metadata) {
    if (q.isTableFormat) {
        return {
            en: q.en,
            hi: q.hi,
            test: metadata.test,
            subjectId: q.subjectId && q.subjectId.trim() ? q.subjectId.trim() : (metadata.subjectId || null),
            chapterId: q.chapterId && q.chapterId.trim() ? q.chapterId.trim() : (metadata.chapterId || null),
            topicId: q.topicId && q.topicId.trim() ? q.topicId.trim() : (metadata.topicId || null),
            marks: q.marks !== null && q.marks !== undefined && q.marks !== "" ? Number(q.marks) : (Number(metadata.marks) || 1),
            negativeMarks: q.negativeMarks !== null && q.negativeMarks !== undefined && q.negativeMarks !== "" ? Number(q.negativeMarks) : (Number(metadata.negativeMarks) || 0),
            perQuestionTime: q.perQuestionTime !== null && q.perQuestionTime !== undefined && q.perQuestionTime !== "" ? Number(q.perQuestionTime) : (metadata.perQuestionTime ? Number(metadata.perQuestionTime) : null),
            difficulty: q.difficulty && q.difficulty.trim() ? q.difficulty.trim().toLowerCase() : (metadata.difficulty || "medium"),
            status: metadata.status || "active",
        };
    }

    const qParsed = extractTextAndImage(q.questionText);

    const optionsParsed = q.options.map((opt) => {
        const optParsed = extractTextAndImage(opt.text);
        return {
            text: optParsed.text || "",
            image: optParsed.image || "",
            isCorrect: opt.key === q.correctAnswer,
        };
    });

    const expText = q.explanation || q.detailedExplanation || "";
    const expParsed = extractTextAndImage(expText);

    const langObj = {
        question: {
            text: qParsed.text,
            image: qParsed.image,
        },
        options: optionsParsed,
        explanation: {
            text: expParsed.text,
            image: expParsed.image,
        },
    };

    return {
        en: langObj,
        hi: langObj,
        test: metadata.test,
        subjectId: q.subjectId && q.subjectId.trim() ? q.subjectId.trim() : (metadata.subjectId || null),
        chapterId: q.chapterId && q.chapterId.trim() ? q.chapterId.trim() : (metadata.chapterId || null),
        topicId: q.topicId && q.topicId.trim() ? q.topicId.trim() : (metadata.topicId || null),
        marks: Number(metadata.marks) || 1,
        negativeMarks: Number(metadata.negativeMarks) || 0,
        perQuestionTime: metadata.perQuestionTime ? Number(metadata.perQuestionTime) : null,
        difficulty: metadata.difficulty || "medium",
        status: metadata.status || "active",
    };
}

async function parseXmlFile(fileBuffer, metadata) {
    const xmlString = fileBuffer.toString("utf-8");
    const doc = new DOMParser().parseFromString(xmlString, "text/xml");

    const questionNodes = doc.getElementsByTagName("question");
    const questions = [];

    for (let i = 0; i < questionNodes.length; i++) {
        const qNode = questionNodes[i];

        const parseLangBlock = (lang) => {
            const langNodes = qNode.getElementsByTagName(lang);
            if (langNodes.length === 0) return null;

            const langNode = langNodes[0];

            const textNode = langNode.getElementsByTagName("text")[0];
            const imgNode = langNode.getElementsByTagName("image")[0];

            const questionText = textNode ? textNode.textContent.trim() : "";
            const questionImage = imgNode ? imgNode.textContent.trim() : "";

            const optionsNode = langNode.getElementsByTagName("options")[0];
            const optionNodes = optionsNode ? optionsNode.getElementsByTagName("option") : [];
            const options = [];

            for (let j = 0; j < optionNodes.length; j++) {
                const optNode = optionNodes[j];
                const optTextNode = optNode.getElementsByTagName("text")[0];
                const optImgNode = optNode.getElementsByTagName("image")[0];
                const isCorrectAttr = optNode.getAttribute("isCorrect") === "true";

                options.push({
                    text: optTextNode ? optTextNode.textContent.trim() : "",
                    image: optImgNode ? optImgNode.textContent.trim() : "",
                    isCorrect: isCorrectAttr,
                });
            }

            const explanationNode = langNode.getElementsByTagName("explanation")[0];
            const expTextNode = explanationNode ? explanationNode.getElementsByTagName("text")[0] : null;
            const expImgNode = explanationNode ? explanationNode.getElementsByTagName("image")[0] : null;

            const explanation = {
                text: expTextNode ? expTextNode.textContent.trim() : "",
                image: expImgNode ? expImgNode.textContent.trim() : "",
            };

            return {
                question: { text: questionText, image: questionImage },
                options,
                explanation,
            };
        };

        let en = parseLangBlock("en");
        let hi = parseLangBlock("hi");

        if (!en && hi) en = hi;
        if (!hi && en) hi = en;

        if (!en && !hi) {
            continue;
        }

        const marksNode = qNode.getElementsByTagName("marks")[0];
        const negMarksNode = qNode.getElementsByTagName("negativeMarks")[0];
        const timeNode = qNode.getElementsByTagName("perQuestionTime")[0];
        const statusNode = qNode.getElementsByTagName("status")[0];
        const subjectNode = qNode.getElementsByTagName("subjectId")[0];
        const chapterNode = qNode.getElementsByTagName("chapterId")[0];
        const topicNode = qNode.getElementsByTagName("topicId")[0];
        const difficultyNode = qNode.getElementsByTagName("difficulty")[0];

        const marks = marksNode ? Number(marksNode.textContent) : (Number(metadata.marks) || 1);
        const negativeMarks = negMarksNode ? Number(negMarksNode.textContent) : (Number(metadata.negativeMarks) || 0);
        const perQuestionTime = timeNode ? Number(timeNode.textContent) : (metadata.perQuestionTime ? Number(metadata.perQuestionTime) : null);
        const status = statusNode ? statusNode.textContent.trim() : (metadata.status || "active");
        const subjectId = subjectNode && subjectNode.textContent.trim() ? subjectNode.textContent.trim() : (metadata.subjectId || null);
        const chapterId = chapterNode && chapterNode.textContent.trim() ? chapterNode.textContent.trim() : (metadata.chapterId || null);
        const topicId = topicNode && topicNode.textContent.trim() ? topicNode.textContent.trim() : (metadata.topicId || null);
        const difficulty = difficultyNode ? difficultyNode.textContent.trim().toLowerCase() : (metadata.difficulty || "medium");

        questions.push({
            en,
            hi,
            test: metadata.test,
            subjectId,
            chapterId,
            topicId,
            marks,
            negativeMarks,
            perQuestionTime,
            difficulty,
            status,
        });
    }

    return questions;
}

async function extractEmbeddedImagesFromExcel(fileBuffer) {
    const imagesByCell = {}; // "row,col" -> uploadedUrl
    try {
        const JSZip = require("jszip");
        const { DOMParser } = require("xmldom");
        const zip = await JSZip.loadAsync(fileBuffer);

        // Find sheet1 relationship file
        const sheet1RelsFile = zip.file("xl/worksheets/_rels/sheet1.xml.rels");
        if (!sheet1RelsFile) return imagesByCell;

        const sheet1RelsXml = await sheet1RelsFile.async("string");
        const sheet1RelsDoc = new DOMParser().parseFromString(sheet1RelsXml, "text/xml");
        const sheet1Rels = sheet1RelsDoc.getElementsByTagName("Relationship");

        let drawingTarget = null;
        for (let i = 0; i < sheet1Rels.length; i++) {
            const rel = sheet1Rels[i];
            const type = rel.getAttribute("Type") || "";
            if (type.endsWith("/relationships/drawing")) {
                drawingTarget = rel.getAttribute("Target") || "";
                break;
            }
        }

        if (!drawingTarget) return imagesByCell;

        // Resolve drawing target path relative to xl/worksheets/
        let drawingPath = drawingTarget;
        if (drawingPath.startsWith("../")) {
            drawingPath = "xl/" + drawingPath.substring(3);
        } else if (drawingPath.startsWith("/")) {
            drawingPath = "xl" + drawingPath;
        } else {
            drawingPath = "xl/worksheets/" + drawingPath;
        }

        const drawingFile = zip.file(drawingPath);
        if (!drawingFile) return imagesByCell;

        // Load drawing relationship file
        const drawingDir = path.dirname(drawingPath);
        const drawingBase = path.basename(drawingPath);
        const drawingRelsPath = `${drawingDir}/_rels/${drawingBase}.rels`;
        const drawingRelsFile = zip.file(drawingRelsPath);
        const drawingRelsMap = {};

        if (drawingRelsFile) {
            const drawingRelsXml = await drawingRelsFile.async("string");
            const drawingRelsDoc = new DOMParser().parseFromString(drawingRelsXml, "text/xml");
            const rels = drawingRelsDoc.getElementsByTagName("Relationship");
            for (let i = 0; i < rels.length; i++) {
                const rel = rels[i];
                const id = rel.getAttribute("Id");
                const target = rel.getAttribute("Target");
                if (id && target) {
                    let resolvedTarget = target;
                    if (resolvedTarget.startsWith("../")) {
                        resolvedTarget = "xl/" + resolvedTarget.substring(3);
                    } else if (resolvedTarget.startsWith("/")) {
                        resolvedTarget = "xl" + resolvedTarget;
                    } else {
                        resolvedTarget = drawingDir + "/" + resolvedTarget;
                    }
                    drawingRelsMap[id] = resolvedTarget;
                }
            }
        }

        // Parse drawing xml to find anchors and match cells to rIds
        const drawingXml = await drawingFile.async("string");
        const drawingDoc = new DOMParser().parseFromString(drawingXml, "text/xml");

        const anchors = [];
        const allElements = drawingDoc.getElementsByTagName("*");
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            if (el.localName === "twoCellAnchor" || el.localName === "oneCellAnchor") {
                anchors.push(el);
            }
        }

        for (const anchor of anchors) {
            let fromNode = null;
            for (let j = 0; j < anchor.childNodes.length; j++) {
                if (anchor.childNodes[j].localName === "from") {
                    fromNode = anchor.childNodes[j];
                    break;
                }
            }
            if (!fromNode) continue;

            let colNode = null;
            let rowNode = null;
            for (let j = 0; j < fromNode.childNodes.length; j++) {
                const cn = fromNode.childNodes[j];
                if (cn.localName === "col") colNode = cn;
                if (cn.localName === "row") rowNode = cn;
            }
            if (!colNode || !rowNode) continue;

            const colIndex = parseInt(colNode.textContent.trim(), 10);
            const rowIndex = parseInt(rowNode.textContent.trim(), 10);

            let rId = null;
            const blips = anchor.getElementsByTagName("*");
            for (let j = 0; j < blips.length; j++) {
                if (blips[j].localName === "blip") {
                    rId = blips[j].getAttribute("r:embed") || blips[j].getAttribute("r:link") ||
                        blips[j].getAttribute("embed") || blips[j].getAttribute("link");
                    if (rId) break;
                }
            }

            if (!rId) continue;

            const imageZipPath = drawingRelsMap[rId];
            if (!imageZipPath) continue;

            const imgFile = zip.file(imageZipPath);
            if (!imgFile) continue;

            const imgBuffer = await imgFile.async("nodebuffer");
            const ext = path.extname(imageZipPath).toLowerCase() || ".png";
            const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".gif" ? "image/gif" : "image/png";
            const filename = `xlsx_image_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;

            const uploadedUrl = await uploadFile(imgBuffer, filename, "questions", mimeType);
            imagesByCell[`${rowIndex},${colIndex}`] = uploadedUrl;
        }
    } catch (err) {
        console.error("Error extracting embedded images from Excel:", err);
    }
    return imagesByCell;
}

async function parseExcelFile(fileBuffer, metadata) {
    const XLSX = require("xlsx");
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    const imagesByCell = await extractEmbeddedImagesFromExcel(fileBuffer);

    // Build column name to index map from worksheet
    const colNameIndexMap = {};
    if (worksheet["!ref"]) {
        const range = XLSX.utils.decode_range(worksheet["!ref"]);
        const headerRow = range.s.r;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: c });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
                const headerName = String(cell.v).toLowerCase().replace(/[\s_-]+/g, "");
                colNameIndexMap[headerName] = c;
            }
        }
    }

    const Subject = require("../../models/Subject.model");
    let subjectDoc = null;
    let activeSubjectId = metadata.subjectId || metadata.subject;

    // Resolve subject ID
    if (activeSubjectId && String(activeSubjectId).match(/^[0-9a-fA-F]{24}$/)) {
        subjectDoc = await Subject.findOne({ _id: activeSubjectId, isDeleted: false });
    } else if (activeSubjectId) {
        subjectDoc = await Subject.findOne({
            name: { $regex: new RegExp("^" + String(activeSubjectId).trim() + "$", "i") },
            isDeleted: false
        });
        if (subjectDoc) {
            activeSubjectId = subjectDoc._id.toString();
        }
    }

    // Resolve chapter and topic from metadata if they are names
    let activeChapterId = metadata.chapterId || metadata.chapter;
    let activeTopicId = metadata.topicId || metadata.topic;

    // If subject is still not found, try to locate the subject using the chapter name
    if (!subjectDoc) {
        let potentialChapterName = activeChapterId;
        if (!potentialChapterName && rows.length > 0) {
            const firstRow = rows[0];
            const possibleChapterKeys = ["chapter", "chapterid", "chaptername"];
            for (const k of Object.keys(firstRow)) {
                if (possibleChapterKeys.includes(k.toLowerCase().replace(/[\s_-]+/g, ""))) {
                    potentialChapterName = firstRow[k];
                    break;
                }
            }
        }
        if (potentialChapterName && !String(potentialChapterName).match(/^[0-9a-fA-F]{24}$/)) {
            const cleanChName = String(potentialChapterName).trim();
            subjectDoc = await Subject.findOne({
                "chapters.name": { $regex: new RegExp("^" + cleanChName + "$", "i") },
                isDeleted: false
            });
            if (subjectDoc) {
                activeSubjectId = subjectDoc._id.toString();
            }
        }
    }

    if (subjectDoc) {
        if (activeChapterId && !String(activeChapterId).match(/^[0-9a-fA-F]{24}$/)) {
            const cleanChapterName = String(activeChapterId).trim().toLowerCase();
            const ch = subjectDoc.chapters.find(c => c.name.trim().toLowerCase() === cleanChapterName);
            if (ch) {
                activeChapterId = ch._id.toString();
            } else {
                activeChapterId = null;
            }
        }

        if (activeTopicId && !String(activeTopicId).match(/^[0-9a-fA-F]{24}$/) && activeChapterId) {
            const cleanTopicName = String(activeTopicId).trim().toLowerCase();
            const ch = subjectDoc.chapters.find(c => c._id.toString() === activeChapterId);
            if (ch) {
                const tp = ch.topics.find(t => t.name.trim().toLowerCase() === cleanTopicName);
                if (tp) {
                    activeTopicId = tp._id.toString();
                } else {
                    activeTopicId = null;
                }
            } else {
                activeTopicId = null;
            }
        }
    }

    const questions = [];

    // Assuming worksheet range starts at range.s.r, the first row in `rows` array (index 0)
    // corresponds to Excel row: headerRow + 1 + i
    const range = worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]) : { s: { r: 0 } };
    const headerRow = range.s.r;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const excelRowIndex = headerRow + 1 + i;

        const getVal = (possibleKeys) => {
            for (const k of Object.keys(row)) {
                if (possibleKeys.includes(k.toLowerCase().replace(/[\s_-]+/g, ""))) {
                    return row[k];
                }
            }
            return undefined;
        };

        const getColIndex = (possibleKeys) => {
            for (const key of possibleKeys) {
                const cleanKey = key.toLowerCase().replace(/[\s_-]+/g, "");
                if (colNameIndexMap[cleanKey] !== undefined) {
                    return colNameIndexMap[cleanKey];
                }
            }
            return -1;
        };

        const getValOrImage = (possibleKeys, defaultVal) => {
            const colIdx = getColIndex(possibleKeys);
            if (colIdx !== -1) {
                const cellImage = imagesByCell[`${excelRowIndex},${colIdx}`];
                if (cellImage) {
                    return cellImage;
                }
            }
            const val = getVal(possibleKeys);
            return val !== undefined ? val : defaultVal;
        };

        const questionText = getVal(["question", "questiontext", "q", "questiontexten", "questionen"]);
        const questionTextHi = getVal(["questionhi", "questiontexthi", "qhi", "questiontexthindi", "questionhindi"]);

        const optA = getVal(["optiona", "choicea", "opta", "option1", "opt1", "optionaen", "option1en"]);
        const optB = getVal(["optionb", "choiceb", "optb", "option2", "opt2", "optionben", "option2en"]);
        const optC = getVal(["optionc", "choicec", "optc", "option3", "opt3", "optioncen", "option3en"]);
        const optD = getVal(["optiond", "choiced", "optd", "option4", "opt4", "optionden", "option4en"]);

        const optAHi = getVal(["optionahi", "choiceahi", "optahi", "option1hi", "opt1hi", "optionahindi", "option1hindi"]) || optA;
        const optBHi = getVal(["optionbhi", "choicebhi", "optbhi", "option2hi", "opt2hi", "optionbhindi", "option2hindi"]) || optB;
        const optCHi = getVal(["optionchi", "choicechi", "optchi", "option3hi", "opt3hi", "optionchindi", "option3hindi"]) || optC;
        const optDHi = getVal(["optiondhi", "choicedhi", "optdhi", "option4hi", "opt4hi", "optiondhindi", "option4hindi"]) || optD;

        const ans = getVal(["correctoption", "correctanswer", "answer", "correctchoice", "ans"]);

        const explanation = getVal(["explanation", "detailedexplanation", "exp", "explanationen"]);
        const explanationHi = getVal(["explanationhi", "detailedexplanationhi", "exphi", "explanationhindi"]) || explanation;

        const questionImage = getValOrImage(["questionimage", "qimage", "questionimageen"], "");
        const questionImageHi = getValOrImage(["questionimagehi", "qimagehi", "questionimagehindi"], questionImage);

        const optAImage = getValOrImage(["optionaimage", "optaimage", "option1image", "opt1image"], "");
        const optBImage = getValOrImage(["optionbimage", "optbimage", "option2image", "opt2image"], "");
        const optCImage = getValOrImage(["optioncimage", "optcimage", "option3image", "opt3image"], "");
        const optDImage = getValOrImage(["optiondimage", "optdimage", "option4image", "opt4image"], "");

        const optAImageHi = getValOrImage(["optionaimagehi", "optaimagehi", "option1imagehi", "opt1imagehi"], optAImage);
        const optBImageHi = getValOrImage(["optionbimagehi", "optbimagehi", "option2imagehi", "opt2imagehi"], optBImage);
        const optCImageHi = getValOrImage(["optioncimagehi", "optcimagehi", "option3imagehi", "opt3imagehi"], optCImage);
        const optDImageHi = getValOrImage(["optiondimagehi", "optdimagehi", "option4imagehi", "opt4imagehi"], optDImage);

        const explanationImage = getValOrImage(["explanationimage", "expimage", "explanationimageen"], "");
        const explanationImageHi = getValOrImage(["explanationimagehi", "expimagehi", "explanationimagehindi"], explanationImage);

        const marksVal = getVal(["marks", "mark", "points"]);
        const negMarksVal = getVal(["negativemarks", "negmarks", "negativemark"]);
        const perTimeVal = getVal(["perquestiontime", "time", "duration"]);
        const difficultyVal = getVal(["difficulty", "difficultylevel", "level"]);

        const subjectVal = getVal(["subject", "subjectid", "subjectname"]);
        const chapterVal = getVal(["chapter", "chapterid", "chaptername"]);
        const topicVal = getVal(["topic", "topicid", "topicname"]);

        if (!questionText && !questionTextHi && !questionImage && !questionImageHi) {
            continue;
        }

        let correctKey = "";
        if (ans) {
            const cleanAns = String(ans).trim().toUpperCase();
            if (["A", "B", "C", "D"].includes(cleanAns)) {
                correctKey = cleanAns;
            } else if (cleanAns === "1" || cleanAns === "A)") {
                correctKey = "A";
            } else if (cleanAns === "2" || cleanAns === "B)") {
                correctKey = "B";
            } else if (cleanAns === "3" || cleanAns === "C)") {
                correctKey = "C";
            } else if (cleanAns === "4" || cleanAns === "D)") {
                correctKey = "D";
            }
        }

        const enOptions = [
            { text: String(optA || "").trim(), image: String(optAImage || "").trim(), isCorrect: correctKey === "A" },
            { text: String(optB || "").trim(), image: String(optBImage || "").trim(), isCorrect: correctKey === "B" },
            { text: String(optC || "").trim(), image: String(optCImage || "").trim(), isCorrect: correctKey === "C" },
            { text: String(optD || "").trim(), image: String(optDImage || "").trim(), isCorrect: correctKey === "D" },
        ];

        const hiOptions = [
            { text: String(optAHi || "").trim(), image: String(optAImageHi || "").trim(), isCorrect: correctKey === "A" },
            { text: String(optBHi || "").trim(), image: String(optBImageHi || "").trim(), isCorrect: correctKey === "B" },
            { text: String(optCHi || "").trim(), image: String(optCImageHi || "").trim(), isCorrect: correctKey === "C" },
            { text: String(optDHi || "").trim(), image: String(optDImageHi || "").trim(), isCorrect: correctKey === "D" },
        ];

        const enObj = {
            question: { text: String(questionText || questionTextHi || "").trim(), image: String(questionImage || "").trim() },
            options: enOptions,
            explanation: { text: String(explanation || "").trim(), image: String(explanationImage || "").trim() },
        };

        const hiObj = {
            question: { text: String(questionTextHi || questionText || "").trim(), image: String(questionImageHi || "").trim() },
            options: hiOptions,
            explanation: { text: String(explanationHi || "").trim(), image: String(explanationImageHi || "").trim() },
        };

        const marks = marksVal !== undefined && marksVal !== "" ? Number(marksVal) : (Number(metadata.marks) || 1);
        const negativeMarks = negMarksVal !== undefined && negMarksVal !== "" ? Number(negMarksVal) : (Number(metadata.negativeMarks) || 0);
        const perQuestionTime = perTimeVal !== undefined && perTimeVal !== "" ? Number(perTimeVal) : (metadata.perQuestionTime ? Number(metadata.perQuestionTime) : null);
        const difficulty = difficultyVal && difficultyVal.trim() ? difficultyVal.trim().toLowerCase() : (metadata.difficulty || "medium");

        const subjectId = (activeSubjectId && activeSubjectId.match(/^[0-9a-fA-F]{24}$/)) ? activeSubjectId : null;

        let chapterId = null;
        if (chapterVal) {
            const cleanChapterVal = String(chapterVal).trim();
            if (cleanChapterVal.match(/^[0-9a-fA-F]{24}$/)) {
                chapterId = cleanChapterVal;
            } else if (subjectDoc) {
                const chapter = subjectDoc.chapters.find(
                    (c) => c.name.trim().toLowerCase() === cleanChapterVal.toLowerCase()
                );
                if (chapter) {
                    chapterId = chapter._id.toString();
                }
            }
        }
        if (!chapterId && activeChapterId) {
            chapterId = activeChapterId;
        }

        let topicId = null;
        if (topicVal) {
            const cleanTopicVal = String(topicVal).trim();
            if (cleanTopicVal.match(/^[0-9a-fA-F]{24}$/)) {
                topicId = cleanTopicVal;
            } else if (subjectDoc && chapterId) {
                const chapter = subjectDoc.chapters.find(
                    (c) => c._id.toString() === chapterId
                );
                if (chapter) {
                    const topic = chapter.topics.find(
                        (t) => t.name.trim().toLowerCase() === cleanTopicVal.toLowerCase()
                    );
                    if (topic) {
                        topicId = topic._id.toString();
                    }
                }
            }
        }
        if (!topicId && activeTopicId) {
            topicId = activeTopicId;
        }

        questions.push({
            en: enObj,
            hi: hiObj,
            test: metadata.test,
            subjectId: subjectVal || subjectId,
            chapterId,
            topicId,
            marks,
            negativeMarks,
            perQuestionTime,
            difficulty,
            status: metadata.status || "active",
        });
    }

    return questions;
}

module.exports = {
    parseWordFile,
    mapWordQuestionToSchema,
    parseXmlFile,
    parseExcelFile,
    extractTextAndImage,
};
