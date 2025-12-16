(function analyzeLegendRoutes(params: {
  "产能加成（小数格式）": number;
  "生产品质加成（小数格式）": number;
  "生产速度（倍数）": number;
  "生产配方时间（折算成每个产品需要的秒数）": number;
  "分解品质加成（小数格式）": number;
  "分解速度（倍数）": number;
  每秒输入原料数: number;
}) {
  function coreAnalyze({
    P,
    Qp,
    Qr,
    Tc,
  }: {
    P: number;
    Qp: number;
    Qr: number;
    Tc: number;
  }) {
    // ---- basic validation ----
    const nums = { P, Qp, Qr, Tc };
    for (const [k, x] of Object.entries(nums)) {
      if (!Number.isFinite(x))
        throw new Error(`"${k}" must be a finite number`);
    }
    if (Tc <= 0) throw new Error(`Tc must be > 0`);
    if (Qp < 0 || Qp > 1 || Qr < 0 || Qr > 1) {
      throw new Error("Qp/Qr 通常应在 [0,1]；你现在给的值超界了。");
    }

    function qualityMatrix(Q: number) {
      return [
        [1 - Q, 0.9 * Q, 0.09 * Q, 0.009 * Q, 0.001 * Q], // N
        [0, 1 - Q, 0.9 * Q, 0.09 * Q, 0.01 * Q], // U
        [0, 0, 1 - Q, 0.9 * Q, 0.1 * Q], // R
        [0, 0, 0, 1 - Q, Q], // E
        [0, 0, 0, 0, 1], // L
      ];
    }

    const Mp: number[][] = qualityMatrix(Qp);
    const Mr: number[][] = qualityMatrix(Qr);

    function recycleStep({
      currentLevel,
      materials,
      products,
      timeArr,
      recycleTime,
      loopRecycle,
    }: {
      currentLevel: number;
      materials: number[];
      products: number[];
      timeArr: number[];
      recycleTime: number;
      loopRecycle: boolean;
    }) {
      const index = currentLevel - 1;
      const recycleRate = 0.25;
      const qualityMatrixRow = [...Mr[index]];

      const inputCount = products[index];
      products[index] = 0;

      // 输入除以消耗量，得到循环次数，用于抵消回收产生的原材料
      const loopRate = loopRecycle
        ? 1 / (1 - qualityMatrixRow[index] * recycleRate)
        : 1;

      if (loopRecycle) {
        qualityMatrixRow[index] = 0;
      }

      for (let i = 0; i < 5; i++) {
        materials[i] +=
          qualityMatrixRow[i] * recycleRate * loopRate * inputCount;
      }

      timeArr[index] += inputCount * recycleTime * loopRate;
    }

    function produceStep({
      currentLevel,
      materials,
      products,
      timeArr,
    }: {
      currentLevel: number;
      materials: number[];
      products: number[];
      timeArr: number[];
    }) {
      const index = currentLevel - 1;

      const inputCount = materials[index];
      materials[index] = 0;

      const outputArr = Mp[index].map((num) => num * (1 + P) * inputCount);

      for (let i = 0; i < 5; i++) {
        products[i] += outputArr[i];
      }

      timeArr[index] += inputCount * Tc;
    }

    // ============================================================
    // Path 1
    // ============================================================
    const TrRaw = 1 / 32; // 固定
    const path1State = {
      materials: [1, 0, 0, 0, 0],
      products: [0, 0, 0, 0, 0],
      produceTimes: [0, 0, 0, 0, 0],
      recycleTimes: [0, 0, 0, 0, 0],
    };

    for (let i = 1; i <= 4; i++) {
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
    const path2State = {
      materials: [1, 0, 0, 0, 0],
      products: [0, 0, 0, 0, 0],
      produceTimes: [0, 0, 0, 0, 0],
      recycleTimes: [0, 0, 0, 0, 0],
    };

    for (let i = 1; i <= 4; i++) {
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

  const {
    "产能加成（小数格式）": P,
    "生产品质加成（小数格式）": Qp,
    "生产速度（倍数）": Sp,
    "生产配方时间（折算成每个产品需要的秒数）": Tc,
    "分解品质加成（小数格式）": Qr,
    "分解速度（倍数）": Sr,
    每秒输入原料数: Imps,
  } = params;

  const { path1: path1Res, path2: path2Res } = coreAnalyze({
    P,
    Qp,
    Qr,
    Tc,
  });

  function reportResult(
    title: string,
    {
      output,
      recycleTimes,
      produceTimes,
    }: {
      output: number[];
      recycleTimes: number[];
      produceTimes: number[];
    }
  ) {
    console.log(`======================== ${title} ========================`);
    const resItems: [string, number][] = [];
    resItems.push(["每秒传说产出", Imps * output[4]]);
    resItems.push(["生产机器数-普通", (produceTimes[0] * Imps) / Sp]);
    resItems.push(["生产机器数-优良", (produceTimes[1] * Imps) / Sp]);
    resItems.push(["生产机器数-稀有", (produceTimes[2] * Imps) / Sp]);
    resItems.push(["生产机器数-史诗", (produceTimes[3] * Imps) / Sp]);
    resItems.push([
      "生产机器总数",
      (produceTimes.reduce((a, b) => a + b) * Imps) / Sp,
    ]);
    resItems.push(["分解机器数-普通", (recycleTimes[0] * Imps) / Sr]);
    resItems.push(["分解机器数-优良", (recycleTimes[1] * Imps) / Sr]);
    resItems.push(["分解机器数-稀有", (recycleTimes[2] * Imps) / Sr]);
    resItems.push(["分解机器数-史诗", (recycleTimes[3] * Imps) / Sr]);
    resItems.push(["分解机器数-传说", (recycleTimes[4] * Imps) / Sr]);
    resItems.push([
      "分解机器总数",
      (recycleTimes.reduce((a, b) => a + b) * Imps) / Sr,
    ]);

    console.table(
      resItems.map(([label, value]) => ({
        指标: label,
        向上取整值: label === "每秒传说产出" ? value : Math.ceil(value),
        原始值: value,
      }))
    );
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
