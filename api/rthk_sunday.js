export default async function handler(req, res) {
    const now = new Date();
    const dates = [];

    // 1. 生成最近 20 個週日
    for (let i = 0; i < 20; i++) {
        let d = new Date();
        let dayOffset = now.getDay();
        d.setDate(now.getDate() - dayOffset - (i * 7));
        const y = d.getFullYear().toString();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        dates.push({
            fmt: y + m + day,
            utc: d.toUTCString()
        });
    }

    // 2. 抓取數據
    const fetchPromises = dates.map(async (dObj) => {
        // 【核心修正】完全不使用 URLSearchParams 或變量，直接用最原始的字串相加
        const baseUrl = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const finalUrl = baseUrl + "?mychannel=radio1&mydate=" + dObj.fmt + "&mytime=1000";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await response.text();
            
            let episodeName = "";

            // 【標題提取】根據 PDF 第 400 行，提取第 3 個 id="programmeText" 的內容
            const valueRegex = /id="programmeText"[^>]+value="([^"]*)"/gi;
            let match;
            let matches = [];
            while ((match = valueRegex.exec(html)) !== null) {
                matches.push(match[1]);
            }

            if (matches.length >= 3) {
                episodeName = matches[2]; // 第 3 個是集數名稱
            } else if (matches.length > 0) {
                episodeName = matches[matches.length - 1];
            }

            // 清理冗餘文字
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
                   "  <description><![CDATA[專題：" + displayTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            // 萬一抓取失敗，也要確保連結是正確的
            const errorUrl = "https://rthk.hk" + dObj.fmt + "&mytime=1000";
            return "<item><title>抓取失敗 (" + dObj.fmt + ")</title><link>" + errorUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
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
