/**
 * SmartPresentation — AI Presentation Generator (PPTX)
 * Generates structured academic and study presentations using Google Gemini,
 * fetches real educational photography via Wikimedia Commons API,
 * provides layout engine rendering, interactive preview, and PPTX export.
 */
(function (global) {
    'use strict';

    let currentPresentation = null;
    let currentSlideIndex = 0;
    let isGenerating = false;

    const THEMES = {
        'dark': {
            id: 'dark',
            name: 'Modern Dark',
            bg: '#0F172A',
            cardBg: '#1E293B',
            text: '#F8FAFC',
            subtext: '#94A3B8',
            accent: '#007AFF',
            accentHex: '007AFF',
            bgHex: '0F172A',
            cardBgHex: '1E293B',
            textHex: 'F8FAFC',
            subtextHex: '94A3B8'
        },
        'light': {
            id: 'light',
            name: 'Academic Light',
            bg: '#F8FAFC',
            cardBg: '#FFFFFF',
            text: '#0F172A',
            subtext: '#64748B',
            accent: '#2563EB',
            accentHex: '2563EB',
            bgHex: 'F8FAFC',
            cardBgHex: 'FFFFFF',
            textHex: '0F172A',
            subtextHex: '64748B'
        },
        'ocean': {
            id: 'ocean',
            name: 'Ocean Tech',
            bg: '#05192D',
            cardBg: '#0A2540',
            text: '#FFFFFF',
            subtext: '#93C5FD',
            accent: '#00D4FF',
            accentHex: '00D4FF',
            bgHex: '05192D',
            cardBgHex: '0A2540',
            textHex: 'FFFFFF',
            subtextHex: '93C5FD'
        }
    };

    function t(key, fallback) {
        const lang = typeof currentLang !== 'undefined' ? currentLang : 'ru';
        const dict = typeof translations !== 'undefined' ? translations[lang] : null;
        return (dict && dict[key]) || (typeof translations !== 'undefined' && translations['en'] && translations['en'][key]) || fallback || key;
    }

    function getApiKey() {
        if (global.SmartStudyAI && typeof global.SmartStudyAI.getPersonalApiKey === 'function') {
            const key = global.SmartStudyAI.getPersonalApiKey();
            if (key) return key;
        }
        if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GEMINI_API_KEY) {
            const envKey = process.env.REACT_APP_GEMINI_API_KEY.trim();
            if (envKey && !envKey.startsWith('process.env')) return envKey;
        }
        if (global.firebaseConfig && global.firebaseConfig.apiKey) {
            return global.firebaseConfig.apiKey;
        }
        return null;
    }

    async function searchWikimediaImage(query) {
        if (!query || !query.trim()) return null;
        try {
            const cleanQuery = query.replace(/[^\w\s-]/g, ' ').trim();
            const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=4&prop=pageimages&pithumbsize=1000&format=json&origin=*`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            const pages = data.query?.pages;
            if (!pages) return null;

            const list = Object.values(pages).filter(p => p.thumbnail?.source);
            if (list.length === 0) return null;

            return list[0].thumbnail.source;
        } catch (e) {
            console.warn('Wikimedia image search error:', e);
            return null;
        }
    }

    async function generatePresentationSlides(topic, slideCount, lang) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error(t('aiKeyMissing', 'Укажите ваш бесплатный ключ Gemini API в Настройках AI.'));
        }

        const isRu = lang === 'ru';
        const systemPrompt = `You are a world-class academic presentation designer and professor.
Your goal is to generate structured, engaging, educational presentations formatted strictly as valid JSON.
Language to use: ${isRu ? 'Russian' : 'English'}.
Strictly follow this JSON schema:
{
  "title": "Title of presentation",
  "slides": [
    {
      "slideNumber": 1,
      "type": "title",
      "title": "Main Title",
      "subtitle": "Informative subtitle with key focus",
      "speakerNotes": "Speaker introduction notes",
      "imageSearchQuery": "English search keyword for Wikimedia Commons photograph"
    },
    {
      "slideNumber": 2,
      "type": "content",
      "title": "Concise Slide Title",
      "bullets": [
        "First key point with specific facts or insight",
        "Second essential argument or definition",
        "Third actionable conclusion or takeaway"
      ],
      "speakerNotes": "Explanation for speaker",
      "imageSearchQuery": "English search keyword for Wikimedia Commons photograph"
    }
  ]
}
Requirements:
1. Number of content slides: exactly ${slideCount}.
2. First slide must be of type "title". Last slide must be a summary/conclusion.
3. Keep bullets punchy and readable (under 14 words per bullet).
4. imageSearchQuery MUST be in English for accurate Wikipedia / Wikimedia Commons image retrieval (e.g. "Quantum computer IBM", "Mars rover Curiosity", "DNA double helix structure").
5. Output ONLY the raw JSON object, without markdown code fences or conversational text.`;

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `Create a comprehensive ${slideCount}-slide academic presentation on the topic: "${topic}". Return JSON.` }]
                }
            ],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('Empty response received from Gemini.');
        }

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (jsonErr) {
            // Strip any accidental markdown fences
            const clean = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            parsed = JSON.parse(clean);
        }

        // Fetch photography for all slides concurrently
        const slides = parsed.slides || [];
        const imagePromises = slides.map(async (s) => {
            const query = s.imageSearchQuery || s.title || topic;
            const imgUrl = await searchWikimediaImage(query);
            s.imageUrl = imgUrl || null;
            return s;
        });

        await Promise.all(imagePromises);
        return parsed;
    }

    function renderSlideToCanvas(slide, theme, canvasEl) {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext('2d');
        const width = 1280;
        const height = 720;
        canvasEl.width = width;
        canvasEl.height = height;

        // Background
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, width, height);

        // Subtle gradient glow in corner
        const grad = ctx.createRadialGradient(width * 0.9, height * 0.1, 10, width * 0.9, height * 0.1, 600);
        grad.addColorStop(0, theme.accent + '22');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Header / Progress bar
        ctx.fillStyle = theme.accent;
        ctx.fillRect(0, 0, (slide.slideNumber / (currentPresentation?.slides?.length || 1)) * width, 6);

        if (slide.type === 'title') {
            // Title Slide Layout
            ctx.fillStyle = theme.accent;
            ctx.font = '600 24px Poppins, sans-serif';
            ctx.fillText('SMARTSTUDYHUB PRESENTATION', 80, 240);

            ctx.fillStyle = theme.text;
            ctx.font = '800 52px Poppins, sans-serif';
            wrapText(ctx, slide.title, 80, 320, width - 160, 64);

            if (slide.subtitle) {
                ctx.fillStyle = theme.subtext;
                ctx.font = '400 28px Poppins, sans-serif';
                wrapText(ctx, slide.subtitle, 80, 480, width - 160, 40);
            }
            return;
        }

        // Standard Content Slide (55% Text / 45% Image Grid)
        const leftWidth = slide.imageUrl ? 680 : 1120;

        // Slide title
        ctx.fillStyle = theme.accent;
        ctx.font = '600 18px Poppins, sans-serif';
        ctx.fillText(`0${slide.slideNumber} / OVERVIEW`, 80, 90);

        ctx.fillStyle = theme.text;
        ctx.font = '700 40px Poppins, sans-serif';
        wrapText(ctx, slide.title, 80, 150, leftWidth, 50);

        // Bullets container
        if (slide.bullets && slide.bullets.length > 0) {
            let currentY = 240;
            slide.bullets.forEach((bullet) => {
                // Bullet card
                ctx.fillStyle = theme.cardBg;
                ctx.beginPath();
                roundRect(ctx, 80, currentY - 28, leftWidth - 20, 84, 12);
                ctx.fill();

                // Bullet dot
                ctx.fillStyle = theme.accent;
                ctx.beginPath();
                ctx.arc(110, currentY + 14, 7, 0, Math.PI * 2);
                ctx.fill();

                // Bullet text
                ctx.fillStyle = theme.text;
                ctx.font = '500 22px Poppins, sans-serif';
                wrapText(ctx, bullet, 135, currentY + 22, leftWidth - 90, 30);

                currentY += 105;
            });
        }

        // Render Image if available
        if (slide.imageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const imgX = 800;
                const imgY = 120;
                const imgW = 400;
                const imgH = 480;

                ctx.save();
                ctx.beginPath();
                roundRect(ctx, imgX, imgY, imgW, imgH, 18);
                ctx.clip();

                // Cover scaling
                const scale = Math.max(imgW / img.width, imgH / img.height);
                const sw = imgW / scale;
                const sh = imgH / scale;
                const sx = (img.width - sw) / 2;
                const sy = (img.height - sh) / 2;

                ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
                ctx.restore();

                // Subtle border
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                roundRect(ctx, imgX, imgY, imgW, imgH, 18);
                ctx.stroke();
            };
            img.src = slide.imageUrl;
        }
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = (text || '').split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }

    function roundRect(ctx, x, y, width, height, radius) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }

    async function exportToPptx(presentationData, themeId = 'dark') {
        if (!presentationData || !presentationData.slides) return;
        if (typeof PptxGenJS === 'undefined') {
            throw new Error('PptxGenJS library not loaded.');
        }

        const theme = THEMES[themeId] || THEMES.dark;
        const pres = new PptxGenJS();
        pres.layout = 'LAYOUT_16x9';
        pres.title = presentationData.title || 'SmartStudyHub Presentation';

        for (const slideData of presentationData.slides) {
            const slide = pres.addSlide();
            slide.background = { color: theme.bgHex };

            if (slideData.type === 'title') {
                // Title Slide
                slide.addText('SMARTSTUDYHUB ACADEMIC SUITE', {
                    x: 1.0,
                    y: 1.8,
                    w: '80%',
                    h: 0.4,
                    fontSize: 14,
                    fontFace: 'Poppins',
                    color: theme.accentHex,
                    bold: true,
                    charSpacing: 2
                });

                slide.addText(slideData.title, {
                    x: 1.0,
                    y: 2.3,
                    w: '85%',
                    h: 1.8,
                    fontSize: 40,
                    fontFace: 'Poppins',
                    color: theme.textHex,
                    bold: true
                });

                if (slideData.subtitle) {
                    slide.addText(slideData.subtitle, {
                        x: 1.0,
                        y: 4.3,
                        w: '85%',
                        h: 1.2,
                        fontSize: 20,
                        fontFace: 'Poppins',
                        color: theme.subtextHex
                    });
                }
            } else {
                // Content Slide
                const hasImg = !!slideData.imageUrl;
                const textWidth = hasImg ? 7.2 : 11.0;

                slide.addText(`0${slideData.slideNumber} / OVERVIEW`, {
                    x: 1.0,
                    y: 0.6,
                    w: 5.0,
                    h: 0.3,
                    fontSize: 12,
                    fontFace: 'Poppins',
                    color: theme.accentHex,
                    bold: true
                });

                slide.addText(slideData.title, {
                    x: 1.0,
                    y: 0.9,
                    w: textWidth,
                    h: 1.0,
                    fontSize: 28,
                    fontFace: 'Poppins',
                    color: theme.textHex,
                    bold: true
                });

                if (slideData.bullets && slideData.bullets.length > 0) {
                    const bulletsText = slideData.bullets.map(b => ({
                        text: b,
                        options: {
                            bullet: { code: '2022' },
                            breakLine: true,
                            fontSize: 16,
                            color: theme.textHex,
                            fontFace: 'Poppins'
                        }
                    }));

                    slide.addText(bulletsText, {
                        x: 1.0,
                        y: 2.1,
                        w: textWidth,
                        h: 4.5,
                        lineSpacing: 32,
                        margin: 0.1
                    });
                }

                if (hasImg) {
                    try {
                        slide.addImage({
                            path: slideData.imageUrl,
                            x: 8.5,
                            y: 1.2,
                            w: 4.2,
                            h: 5.2,
                            rounding: true
                        });
                    } catch (imgErr) {
                        console.warn('Could not embed slide image in pptx:', imgErr);
                    }
                }
            }

            if (slideData.speakerNotes) {
                slide.addNotes(slideData.speakerNotes);
            }
        }

        const safeTitle = (presentationData.title || 'Presentation').replace(/[^\w\s-]/g, '').trim() || 'presentation';
        await pres.writeFile({ fileName: `${safeTitle}.pptx` });
    }

    function updatePreviewUI() {
        if (!currentPresentation || !currentPresentation.slides) return;
        const slides = currentPresentation.slides;
        if (currentSlideIndex >= slides.length) currentSlideIndex = 0;
        if (currentSlideIndex < 0) currentSlideIndex = slides.length - 1;

        const currentSlide = slides[currentSlideIndex];
        const canvas = document.getElementById('presentation-canvas');
        const themeSelect = document.getElementById('presentation-theme-select')?.value || 'dark';
        const theme = THEMES[themeSelect] || THEMES.dark;

        renderSlideToCanvas(currentSlide, theme, canvas);

        const counterEl = document.getElementById('presentation-slide-counter');
        if (counterEl) {
            counterEl.textContent = `${currentSlideIndex + 1} / ${slides.length}`;
        }

        const notesEl = document.getElementById('presentation-speaker-notes');
        if (notesEl) {
            notesEl.textContent = currentSlide.speakerNotes || '';
        }
    }

    function updatePresentationTranslations() {
        const lang = typeof currentLang !== 'undefined' ? currentLang : 'ru';
        const dict = (typeof translations !== 'undefined' && translations[lang]) || (typeof translations !== 'undefined' && translations['en']) || {};
        document.querySelectorAll('#tools-presentation-panel [data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });
        document.querySelectorAll('#tools-presentation-panel [data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.placeholder = dict[key];
        });
        const tile = document.querySelector('#tile-presentation [data-i18n]');
        if (tile) {
            const key = tile.getAttribute('data-i18n');
            if (dict[key]) tile.textContent = dict[key];
        }
    }

    function initPresentationModule() {
        updatePresentationTranslations();
        try { if (typeof feather !== 'undefined') feather.replace(); } catch (_) {}

        const generateBtn = document.getElementById('presentation-generate-btn');
        const topicInput = document.getElementById('presentation-topic-input');
        const slideCountSelect = document.getElementById('presentation-slides-count');
        const themeSelect = document.getElementById('presentation-theme-select');
        const exportBtn = document.getElementById('presentation-export-btn');
        const prevBtn = document.getElementById('presentation-prev-btn');
        const nextBtn = document.getElementById('presentation-next-btn');
        const regenImgBtn = document.getElementById('presentation-regen-img-btn');

        // Quick topic chip listeners
        document.querySelectorAll('.presentation-topic-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (topicInput) {
                    topicInput.value = chip.getAttribute('data-topic') || chip.textContent.trim();
                    topicInput.focus();
                }
            });
        });

        generateBtn?.addEventListener('click', async () => {
            const topic = topicInput?.value.trim();
            if (!topic) {
                if (typeof showToast === 'function') {
                    showToast(t('presentationEnterTopic', 'Пожалуйста, укажите тему презентации'), 'warning');
                }
                return;
            }

            if (isGenerating) return;
            isGenerating = true;
            generateBtn.disabled = true;

            const statusEl = document.getElementById('presentation-status');
            const previewSection = document.getElementById('presentation-preview-section');
            if (statusEl) {
                statusEl.classList.remove('hidden');
                statusEl.textContent = t('presentationGenerating', 'Создание структуры доклада и подбор иллюстраций...');
            }

            try {
                const count = parseInt(slideCountSelect?.value || '6', 10);
                const lang = typeof currentLang !== 'undefined' ? currentLang : 'ru';
                const result = await generatePresentationSlides(topic, count, lang);
                currentPresentation = result;
                currentSlideIndex = 0;

                if (previewSection) {
                    previewSection.classList.remove('hidden');
                    try { if (typeof feather !== 'undefined') feather.replace(); } catch (_) {}
                }
                updatePreviewUI();

                if (statusEl) statusEl.classList.add('hidden');
                if (typeof showToast === 'function') {
                    showToast(t('presentationSuccess', 'Презентация успешно создана!'), 'success');
                }
            } catch (err) {
                console.error('Presentation generation error:', err);
                if (statusEl) {
                    statusEl.textContent = err.message || 'Ошибка генерации.';
                }
                if (typeof showToast === 'function') {
                    showToast(err.message || 'Ошибка генерации презентации', 'error');
                }
            } finally {
                isGenerating = false;
                generateBtn.disabled = false;
            }
        });

        prevBtn?.addEventListener('click', () => {
            if (!currentPresentation) return;
            currentSlideIndex--;
            updatePreviewUI();
        });

        nextBtn?.addEventListener('click', () => {
            if (!currentPresentation) return;
            currentSlideIndex++;
            updatePreviewUI();
        });

        themeSelect?.addEventListener('change', () => {
            updatePreviewUI();
        });

        regenImgBtn?.addEventListener('click', async () => {
            if (!currentPresentation || !currentPresentation.slides) return;
            const slide = currentPresentation.slides[currentSlideIndex];
            if (!slide) return;
            regenImgBtn.disabled = true;
            try {
                const query = slide.imageSearchQuery || slide.title;
                const newImg = await searchWikimediaImage(query);
                if (newImg) {
                    slide.imageUrl = newImg;
                    updatePreviewUI();
                    if (typeof showToast === 'function') {
                        showToast(t('presentationImgUpdated', 'Изображение обновлено'), 'success');
                    }
                }
            } catch (_) {}
            finally {
                regenImgBtn.disabled = false;
            }
        });

        exportBtn?.addEventListener('click', async () => {
            if (!currentPresentation) return;
            exportBtn.disabled = true;
            try {
                const themeId = themeSelect?.value || 'dark';
                await exportToPptx(currentPresentation, themeId);
                if (typeof showToast === 'function') {
                    showToast(t('presentationExported', 'Файл .PPTX успешно сохранен!'), 'success');
                }
            } catch (exportErr) {
                console.error('Export error:', exportErr);
                if (typeof showToast === 'function') {
                    showToast(exportErr.message || 'Ошибка экспорта файла', 'error');
                }
            } finally {
                exportBtn.disabled = false;
            }
        });
    }

    global.SmartPresentation = {
        init: initPresentationModule,
        generate: generatePresentationSlides,
        exportToPptx: exportToPptx,
        updateTranslations: updatePresentationTranslations
    };

})(typeof window !== 'undefined' ? window : globalThis);
