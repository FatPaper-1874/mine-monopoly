export function modifyColor(color: string, s: number): string {
    // 匹配 RGB 颜色字符串中的小数值
    const regex = /([\d\.]+)\s*,\s*([\d\.]+)\s*,\s*([\d\.]+)/;
    const match = color.match(regex);
    if (match) {
        // 将字符串转换为数字并减少 10%
        const r = Math.round(parseFloat(match[1]));
        const g = Math.round(parseFloat(match[2]));
        const b = Math.round(parseFloat(match[3]));

        const newR = Math.round(r * s);
        const newG = Math.round(g * s);
        const newB = Math.round(b * s);

        // 确保每个通道值在 0-255 之间
        const clampedR = Math.min(255, Math.max(0, newR));
        const clampedG = Math.min(255, Math.max(0, newG));
        const clampedB = Math.min(255, Math.max(0, newB));

        // 返回新的 RGB 颜色值
        return `rgb(${clampedR}, ${clampedG}, ${clampedB})`;
    } else {
        return "rgb(255, 255, 255)";
    }
}

export function randomRGBColor() {
    const H = Math.random();
    const S = Math.random();
    const L = 0.5;
    let ret = [H, S, L];
    ret[1] = 0.7 + ret[1] * 0.2; // [0.7 - 0.9] 排除过灰颜色

    // 数据转化到小数点后两位
    ret = ret.map(function (item) {
        return parseFloat(item.toFixed(2));
    });

    let R, G, B;

    function hue2rgb(p: any, q: any, t: any){
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let Q = L < 0.5 ? L * (1 + S) : L + S - L * S;
    let P = 2 * L - Q;
    R = hue2rgb(P, Q, H + 1 / 3) * 255;
    G = hue2rgb(P, Q, H) * 255;
    B = hue2rgb(P, Q, H - 1 / 3) * 255;

    return `rgb(${parseFloat(R.toFixed(2))}, ${parseFloat(G.toFixed(2))}, ${parseFloat(B.toFixed(2))})`;
}

export function randomHEXColor() {
    const H = Math.random();
    const S = Math.random();
    const L = 0.5;
    let ret = [H, S, L];
    ret[1] = 0.7 + ret[1] * 0.2; // [0.7 - 0.9] 排除过灰颜色

    // 数据转化到小数点后两位
    ret = ret.map(function (item) {
        return parseFloat(item.toFixed(2));
    });

    let R, G, B;

    function hue2rgb(p: any, q: any, t: any){
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let Q = L < 0.5 ? L * (1 + S) : L + S - L * S;
    let P = 2 * L - Q;
    R = hue2rgb(P, Q, H + 1 / 3) * 255;
    G = hue2rgb(P, Q, H) * 255;
    B = hue2rgb(P, Q, H - 1 / 3) * 255;

    return `#${Math.round(R).toString(16)}${Math.round(G).toString(16)}${Math.round(B).toString(16)}`;
}
