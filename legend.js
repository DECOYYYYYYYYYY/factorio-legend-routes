var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
(function analyzeLegendRoutes(params) {
    function coreAnalyze(_a) {
        var P = _a.P, Qp = _a.Qp, Qr = _a.Qr, Tc = _a.Tc;
        // ---- basic validation ----
        var nums = { P: P, Qp: Qp, Qr: Qr, Tc: Tc };
        for (var _i = 0, _b = Object.entries(nums); _i < _b.length; _i++) {
            var _c = _b[_i], k = _c[0], x = _c[1];
            if (!Number.isFinite(x))
                throw new Error("\"".concat(k, "\" must be a finite number"));
        }
        if (Tc <= 0)
            throw new Error("Tc must be > 0");
        if (Qp < 0 || Qp > 1 || Qr < 0 || Qr > 1) {
            throw new Error("Qp/Qr 通常应在 [0,1]；你现在给的值超界了。");
        }
        function qualityMatrix(Q) {
            return [
                [1 - Q, 0.9 * Q, 0.09 * Q, 0.009 * Q, 0.001 * Q], // N
                [0, 1 - Q, 0.9 * Q, 0.09 * Q, 0.01 * Q], // U
                [0, 0, 1 - Q, 0.9 * Q, 0.1 * Q], // R
                [0, 0, 0, 1 - Q, Q], // E
                [0, 0, 0, 0, 1], // L
            ];
        }
        var Mp = qualityMatrix(Qp);
        var Mr = qualityMatrix(Qr);
        function recycleStep(_a) {
            var currentLevel = _a.currentLevel, materials = _a.materials, products = _a.products, timeArr = _a.timeArr, recycleTime = _a.recycleTime, loopRecycle = _a.loopRecycle;
            var index = currentLevel - 1;
            var recycleRate = 0.25;
            var qualityMatrixRow = __spreadArray([], Mr[index], true);
            var inputCount = products[index];
            products[index] = 0;
            // 输入除以消耗量，得到循环次数，用于抵消回收产生的原材料
            var loopRate = loopRecycle
                ? 1 / (1 - qualityMatrixRow[index] * recycleRate)
                : 1;
            if (loopRecycle) {
                qualityMatrixRow[index] = 0;
            }
            for (var i = 0; i < 5; i++) {
                materials[i] +=
                    qualityMatrixRow[i] * recycleRate * loopRate * inputCount;
            }
            timeArr[index] += inputCount * recycleTime * loopRate;
        }
        function produceStep(_a) {
            var currentLevel = _a.currentLevel, materials = _a.materials, products = _a.products, timeArr = _a.timeArr;
            var index = currentLevel - 1;
            var inputCount = materials[index];
            materials[index] = 0;
            var outputArr = Mp[index].map(function (num) { return num * (1 + P) * inputCount; });
            for (var i = 0; i < 5; i++) {
                products[i] += outputArr[i];
            }
            timeArr[index] += inputCount * Tc;
        }
        // ============================================================
        // Path 1
        // ============================================================
        var TrRaw = 1 / 32; // 固定
        var path1State = {
            materials: [1, 0, 0, 0, 0],
            products: [0, 0, 0, 0, 0],
            produceTimes: [0, 0, 0, 0, 0],
            recycleTimes: [0, 0, 0, 0, 0],
        };
        for (var i = 1; i <= 4; i++) {
            recycleStep({
                currentLevel: i,
                materials: path1State.materials,
                products: path1State.materials,
                timeArr: path1State.recycleTimes,
                recycleTime: TrRaw,
                loopRecycle: true,
            });
        }
        // ============================================================
        // Path 2
        // ============================================================
        var path2State = {
            materials: [1, 0, 0, 0, 0],
            products: [0, 0, 0, 0, 0],
            produceTimes: [0, 0, 0, 0, 0],
            recycleTimes: [0, 0, 0, 0, 0],
        };
        for (var i = 1; i <= 4; i++) {
            while (true) {
                produceStep({
                    currentLevel: i,
                    materials: path2State.materials,
                    products: path2State.products,
                    timeArr: path2State.produceTimes,
                });
                recycleStep({
                    currentLevel: i,
                    materials: path2State.materials,
                    products: path2State.products,
                    timeArr: path2State.recycleTimes,
                    recycleTime: Tc / 16,
                    loopRecycle: false,
                });
                if (path2State.materials[i - 1] < 1e-20) {
                    path2State.materials[i - 1] = 0;
                    break;
                }
            }
        }
        recycleStep({
            currentLevel: 5,
            materials: path2State.materials,
            products: path2State.products,
            timeArr: path2State.recycleTimes,
            recycleTime: Tc / 16,
            loopRecycle: false,
        });
        return {
            path1: {
                output: path1State.materials,
                recycleTimes: path1State.recycleTimes,
                produceTimes: path1State.produceTimes,
            },
            path2: {
                output: path2State.materials,
                recycleTimes: path2State.recycleTimes,
                produceTimes: path2State.produceTimes,
            },
        };
    }
    var P = params["\u4EA7\u80FD\u52A0\u6210\uFF08\u5C0F\u6570\u683C\u5F0F\uFF09"], Qp = params["\u751F\u4EA7\u54C1\u8D28\u52A0\u6210\uFF08\u5C0F\u6570\u683C\u5F0F\uFF09"], Sp = params["\u751F\u4EA7\u901F\u5EA6\uFF08\u500D\u6570\uFF09"], Tc = params["\u751F\u4EA7\u914D\u65B9\u65F6\u95F4\uFF08\u6298\u7B97\u6210\u6BCF\u4E2A\u4EA7\u54C1\u9700\u8981\u7684\u79D2\u6570\uFF09"], Qr = params["\u5206\u89E3\u54C1\u8D28\u52A0\u6210\uFF08\u5C0F\u6570\u683C\u5F0F\uFF09"], Sr = params["\u5206\u89E3\u901F\u5EA6\uFF08\u500D\u6570\uFF09"], Imps = params.每秒输入原料数;
    var _a = coreAnalyze({
        P: P,
        Qp: Qp,
        Qr: Qr,
        Tc: Tc,
    }), path1Res = _a.path1, path2Res = _a.path2;
    function reportResult(title, _a) {
        var output = _a.output, recycleTimes = _a.recycleTimes, produceTimes = _a.produceTimes;
        console.log("======================== ".concat(title, " ========================"));
        var resItems = [];
        resItems.push(["每秒传说产出", Imps * output[4]]);
        resItems.push(["生产机器数-普通", (produceTimes[0] * Imps) / Sp]);
        resItems.push(["生产机器数-优良", (produceTimes[1] * Imps) / Sp]);
        resItems.push(["生产机器数-稀有", (produceTimes[2] * Imps) / Sp]);
        resItems.push(["生产机器数-史诗", (produceTimes[3] * Imps) / Sp]);
        resItems.push([
            "生产机器总数",
            (produceTimes.reduce(function (a, b) { return a + b; }) * Imps) / Sp,
        ]);
        resItems.push(["分解机器数-普通", (recycleTimes[0] * Imps) / Sr]);
        resItems.push(["分解机器数-优良", (recycleTimes[1] * Imps) / Sr]);
        resItems.push(["分解机器数-稀有", (recycleTimes[2] * Imps) / Sr]);
        resItems.push(["分解机器数-史诗", (recycleTimes[3] * Imps) / Sr]);
        resItems.push(["分解机器数-传说", (recycleTimes[4] * Imps) / Sr]);
        resItems.push([
            "分解机器总数",
            (recycleTimes.reduce(function (a, b) { return a + b; }) * Imps) / Sr,
        ]);
        console.table(resItems.map(function (_a) {
            var label = _a[0], value = _a[1];
            return ({
                指标: label,
                向上取整值: label === "每秒传说产出" ? value : Math.ceil(value),
                原始值: value,
            });
        }));
    }
    reportResult("路径一：原料转转乐", path1Res);
    reportResult("路径二：生产上级物品再分解", path2Res);
})({
    "产能加成（小数格式）": 0.5,
    "生产品质加成（小数格式）": 0.31,
    "生产速度（倍数）": 3.75,
    "生产配方时间（折算成每个产品需要的秒数）": 5,
    "分解品质加成（小数格式）": 0.248,
    "分解速度（倍数）": 1,
    每秒输入原料数: 60,
});
