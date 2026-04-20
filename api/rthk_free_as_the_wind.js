export default async function handler(req, res) {
    const now = new Date();
    const dates = [];
    let count = 0;
    let offset = 0;

    // 1. 循環尋找最近的 30 個工作日 (週一至週五)
    while (count < 30) {
        let d = new Date();
        d.setDate(now.getDate() - offset);
        const dayOfWeek = d.getDay(); // 0 是週日, 6 是週六

        // 排除週六 (6) 和 週日 (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const y = d.getFullYear().toString();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            dates.push({
                fmt: y + m + day,
                utc: d.toUTCString()
            });
            count++;
        }
        offset++;
        // 安全機制：防止無限循環
        if (offset > 100) break;
    }

    // 2. 批量抓取與解析
    const fetchPromises = dates.map(async (dObj) => {
        const baseUrl = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const finalUrl = baseUrl + "?mychannel=radio1&mydate=" + dObj.fmt + "&mytime=2235";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await response.text();
            
            let episodeName = "";
            const valueRegex = /id="programmeText"[^>]+value="([^"]*)"/gi;
            let match;
            let matches = [];
            while ((match = valueRegex.exec(html)) !== null) {
                matches.push(match);
            }

            // 根據之前的經驗，第 3 個 (index 2) 是真正的專題名稱
            if (matches.length >= 3) {
                episodeName = matches[2][1];
            } else if (matches.length > 0) {
                episodeName = matches[matches.length - 1][1];
            }

            if (episodeName) {
                episodeName = episodeName.replace("講東講西", "").replace("第一台", "").trim();
            }

            const displayTitle = (episodeName && episodeName.length > 0) ? episodeName : "平日版";
            const finalTitle = "講東講西：" + displayTitle + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[專題：" + displayTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>暫時無法獲取 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

    const feedItems = await Promise.all(fetchPromises);

    const rss = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
                '<rss version="2.0">\n' +
                '<channel>\n' +
                '  <title>香港電台：講東講西 - 平日版</title>\n' +
                '  <link>https://rthk.hk</link>\n' +
                '  ' + feedItems.join('\n') + '\n' +
                '</channel>\n' +
                '</rss>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(rss);
}
