export default async function handler(req, res) {
    const dates = [];
    const now = new Date();

    // 1. 生成最近 5 個週日
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay();
        d.setDate(now.getDate() - dayOffset - (i * 7));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push({
            fmt: String(y) + String(m) + String(day),
            utc: d.toUTCString()
        });
    }

    // 2. 抓取數據
    const fetchPromises = dates.map(async (dObj) => {
        const finalUrl = "https://rthk.hk" + dObj.fmt + "&mytime=1000";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await response.text();
            
            let episodeName = "";

            // 【核心修正】提取所有 id="programmeText" 的 value 內容
            // 根據 PDF 原始碼，頁面上有 3 個，第 3 個是我們要的「集數名稱」
            const valueRegex = /id="programmeText"[^>]+value="([^"]*)"/gi;
            let matches = [];
            let m;
            while ((m = valueRegex.exec(html)) !== null) {
                matches.push(m[1]);
            }

            if (matches.length >= 3) {
                // 取第 3 個 (索引為 2)
                episodeName = matches[2].trim();
            } else if (matches.length > 0) {
                // 如果不足 3 個，取最後一個
                episodeName = matches[matches.length - 1].trim();
            }

            // 清理標題，去掉冗餘字眼
            if (episodeName) {
                episodeName = episodeName.replace("講東講西 - 週日版", "").replace("第一台", "").trim();
            }

            const displayTitle = (episodeName && episodeName.length > 0) ? episodeName : "週日版";
            const finalTitle = "講東講西：" + displayTitle + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[本集專題：" + displayTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>抓取失敗 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

    const feedItems = await Promise.all(fetchPromises);

    const rss = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
                '<rss version="2.0">\n' +
                '<channel>\n' +
                '  <title>香港電台：講東講西 - 週日版</title>\n' +
                '  <link>https://rthk.hk</link>\n' +
                '  ' + feedItems.join('\n') + '\n' +
                '</channel>\n' +
                '</rss>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(rss);
}
