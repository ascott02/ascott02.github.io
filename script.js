// Logistic function
function logistic(x) {
    return 1.0 / (1.0 + Math.exp(-x));
}

// ICC functions
function icc1PL(theta, b) {
    return logistic(theta - b);
}

function icc2PL(theta, a, b) {
    return logistic(a * (theta - b));
}

function icc3PL(theta, a, b, c) {
    return c + (1.0 - c) * logistic(a * (theta - b));
}

function icc4PL(theta, a, b, c, d) {
    return c + (d - c) * logistic(a * (theta - b));
}

// Helper to create an empty Plotly figure with curve, theta marker, and vertical theta line
function createFigure(containerId, title) {
    const xGrid = window.thetaGrid;
    const lineTrace = { x: xGrid, y: xGrid.map(() => 0), mode: 'lines', name: 'ICC' };
    const markerTrace = { x: [0], y: [0], mode: 'markers', name: 'θ', marker: { size: 10 } };
    const layout = {
        title,
        xaxis: { title: 'Ability θ', range: [-4, 4] },
        yaxis: { title: 'P(correct)', range: [0, 1] },
        template: 'plotly_white',
        shapes: [
            { type: 'line', x0: 0, x1: 0, y0: 0, y1: 1, line: { dash: 'dot' } }
        ]
    };
    Plotly.newPlot(containerId, [lineTrace, markerTrace], layout);
}

// Ensure thetaGrid is declared only once
if (!window.thetaGrid) {
    window.thetaGrid = Array.from({ length: 400 }, (_, i) => -4 + (i * 8 / 399));
}

// Render equations using KaTeX if available
document.addEventListener('DOMContentLoaded', () => {
    const render = (elId, tex) => {
        const el = document.getElementById(elId);
        if (el && window.katex) {
            window.katex.render(tex, el, { throwOnError: false });
        } else if (el) {
            // Fallback plain text if KaTeX not loaded yet
            el.textContent = tex;
        }
    };
    render('eq1PL', 'P(\\theta)=\\tfrac{1}{1+e^{-(\\theta-b)}}');
    render('eq2PL', 'P(\\theta)=\\tfrac{1}{1+e^{-a(\\theta-b)}}');
    render('eq3PL', 'P(\\theta)=c + (1-c)\\,\\tfrac{1}{1+e^{-a(\\theta-b)}}');
    render('eq4PL', 'P(\\theta)=c + (d-c)\\,\\tfrac{1}{1+e^{-a(\\theta-b)}}');
});

// Initialize a model with sliders and dynamic Plotly updates
function setupModel({ containerId, slidersId, title, params, computeCurve, computePoint }) {
    // Create plot
    createFigure(containerId, title);

    // Build sliders
    const slidersContainer = document.getElementById(slidersId);
    const sliderObjs = params.map(p =>
        createSlider(p.id, p.label, p.min, p.max, p.step, p.defaultValue, update)
    );
    sliderObjs.forEach(s => slidersContainer.appendChild(s.wrapper));

    // Optional: Add a checkbox to lock θ and b together when both sliders exist
    const thetaSlider = sliderObjs.find(s => s.input.id.startsWith('theta'));
    const bSlider = sliderObjs.find(s => s.input.id.startsWith('b'));

    let lockContainer, lockCheckbox;
    if (thetaSlider && bSlider) {
        lockContainer = document.createElement('div');
        lockContainer.className = 'lock-row';
        lockCheckbox = document.createElement('input');
        lockCheckbox.type = 'checkbox';
        lockCheckbox.id = `${slidersId}-lock`;
        const lockLabel = document.createElement('label');
        lockLabel.setAttribute('for', lockCheckbox.id);
        lockLabel.textContent = 'Lock θ and b';
        lockContainer.appendChild(lockCheckbox);
        lockContainer.appendChild(lockLabel);
        // Insert above sliders
        slidersContainer.prepend(lockContainer);

        // Capture-phase listeners to sync before update() runs
        const onThetaCapture = () => {
            if (!lockCheckbox.checked) return;
            const t = parseFloat(thetaSlider.input.value);
            const bmin = parseFloat(bSlider.input.min);
            const bmax = parseFloat(bSlider.input.max);
            const nb = Math.max(bmin, Math.min(bmax, t));
            if (parseFloat(bSlider.input.value) !== nb) {
                bSlider.input.value = String(nb);
                bSlider.valueSpan.textContent = String(nb);
            }
        };
        const onBCapture = () => {
            if (!lockCheckbox.checked) return;
            const b = parseFloat(bSlider.input.value);
            const tmin = parseFloat(thetaSlider.input.min);
            const tmax = parseFloat(thetaSlider.input.max);
            const nt = Math.max(tmin, Math.min(tmax, b));
            if (parseFloat(thetaSlider.input.value) !== nt) {
                thetaSlider.input.value = String(nt);
                thetaSlider.valueSpan.textContent = String(nt);
            }
        };
        thetaSlider.input.addEventListener('input', onThetaCapture, { capture: true });
        bSlider.input.addEventListener('input', onBCapture, { capture: true });

        // When toggled on, immediately sync b to current θ and update plot
        lockCheckbox.addEventListener('change', () => {
            if (lockCheckbox.checked) {
                onThetaCapture();
                update();
            }
        });
    }

    function getValues() {
        const values = {};
        sliderObjs.forEach(s => {
            const key = s.input.id;
            values[key] = parseFloat(s.input.value);
        });
        return values;
    }

    function update() {
        const v = getValues();
        const curveY = computeCurve(v);
        const point = computePoint(v);

        // Update curve (trace 0) and marker (trace 1)
        Plotly.restyle(containerId, { y: [curveY] }, [0]);
        Plotly.restyle(containerId, { x: [[point.x]], y: [[point.y]] }, [1]);
        // Update vertical theta line
        Plotly.relayout(containerId, { 'shapes[0].x0': point.x, 'shapes[0].x1': point.x });
    }

    // Initial update
    update();
}

// 1PL: sliders θ, b
setupModel({
    containerId: 'plot1PL',
    slidersId: 'sliders1PL',
    title: '1PL (Rasch)',
    params: [
        { id: 'theta1PL', label: 'θ (ability)', min: -4, max: 4, step: 0.1, defaultValue: 0 },
        { id: 'b1PL', label: 'b (difficulty)', min: -3, max: 3, step: 0.1, defaultValue: 0 }
    ],
    computeCurve: (v) => window.thetaGrid.map(t => icc1PL(t, v.b1PL)),
    computePoint: (v) => ({ x: v.theta1PL, y: icc1PL(v.theta1PL, v.b1PL) })
});

// 2PL: sliders θ, a, b
setupModel({
    containerId: 'plot2PL',
    slidersId: 'sliders2PL',
    title: '2PL',
    params: [
        { id: 'theta2PL', label: 'θ (ability)', min: -4, max: 4, step: 0.1, defaultValue: 0 },
        { id: 'a2PL', label: 'a (discrimination)', min: 0.1, max: 3, step: 0.05, defaultValue: 1 },
        { id: 'b2PL', label: 'b (difficulty)', min: -3, max: 3, step: 0.1, defaultValue: 0 }
    ],
    computeCurve: (v) => window.thetaGrid.map(t => icc2PL(t, v.a2PL, v.b2PL)),
    computePoint: (v) => ({ x: v.theta2PL, y: icc2PL(v.theta2PL, v.a2PL, v.b2PL) })
});

// 3PL: sliders θ, a, b, c
setupModel({
    containerId: 'plot3PL',
    slidersId: 'sliders3PL',
    title: '3PL',
    params: [
        { id: 'theta3PL', label: 'θ (ability)', min: -4, max: 4, step: 0.1, defaultValue: 0 },
        { id: 'a3PL', label: 'a (discrimination)', min: 0.1, max: 3, step: 0.05, defaultValue: 1 },
        { id: 'b3PL', label: 'b (difficulty)', min: -3, max: 3, step: 0.1, defaultValue: 0 },
        { id: 'c3PL', label: 'c (guessing)', min: 0, max: 0.35, step: 0.01, defaultValue: 0.2 }
    ],
    computeCurve: (v) => window.thetaGrid.map(t => icc3PL(t, v.a3PL, v.b3PL, v.c3PL)),
    computePoint: (v) => ({ x: v.theta3PL, y: icc3PL(v.theta3PL, v.a3PL, v.b3PL, v.c3PL) })
});

// 4PL: sliders θ, a, b, c, d (ensure d >= c)
setupModel({
    containerId: 'plot4PL',
    slidersId: 'sliders4PL',
    title: '4PL',
    params: [
        { id: 'theta4PL', label: 'θ (ability)', min: -4, max: 4, step: 0.1, defaultValue: 0 },
        { id: 'a4PL', label: 'a (discrimination)', min: 0.1, max: 3, step: 0.05, defaultValue: 1 },
        { id: 'b4PL', label: 'b (difficulty)', min: -3, max: 3, step: 0.1, defaultValue: 0 },
        { id: 'c4PL', label: 'c (guessing)', min: 0, max: 0.35, step: 0.01, defaultValue: 0.2 },
        { id: 'd4PL', label: 'd (upper asymptote)', min: 0.65, max: 1, step: 0.01, defaultValue: 0.9 }
    ],
    computeCurve: (v) => {
        const d = Math.max(v.d4PL, v.c4PL + 1e-6);
        return window.thetaGrid.map(t => icc4PL(t, v.a4PL, v.b4PL, v.c4PL, d));
    },
    computePoint: (v) => {
        const d = Math.max(v.d4PL, v.c4PL + 1e-6);
        return { x: v.theta4PL, y: icc4PL(v.theta4PL, v.a4PL, v.b4PL, v.c4PL, d) };
    }
});

// Slider factory that returns wrapper + elements and updates value live
function createSlider(id, label, min, max, step, defaultValue, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider';

    const lbl = document.createElement('label');
    lbl.setAttribute('for', id);
    lbl.textContent = label + ':';

    const valueSpan = document.createElement('span');
    valueSpan.id = id + '_value';
    valueSpan.textContent = String(defaultValue);

    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(defaultValue);
    input.addEventListener('input', () => {
        valueSpan.textContent = input.value;
        onChange();
    });

    wrapper.appendChild(lbl);
    wrapper.appendChild(valueSpan);
    wrapper.appendChild(input);
    return { wrapper, input, valueSpan };
}

// Expose functions to the global scope
window.logistic = logistic;
window.icc1PL = icc1PL;
window.icc2PL = icc2PL;
window.icc3PL = icc3PL;
window.icc4PL = icc4PL;
// No need to expose createFigure or setup helpers