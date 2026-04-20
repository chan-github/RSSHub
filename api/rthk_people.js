export default async function handler(req, res) {
    const now = new Date();
    const dates = [];
    let count = 0;
    let offset = 0; 

    // 1. 循環尋找最近的 10 個週六 (Saturday)
    while (count < 10) {
        let d = new Date();
        d.setDate(now.getDate() - offset);
        
        // 0 是週日, 6 是週六。這裡只保留週六 (6)
        if (d.getDay() === 6) {
            // 如果是今天且還沒到晚上 8 點 (20:00)，則跳過當天
            const isToday = d.toDateString() === now.toDateString();
            const isPassed = now.getHours() >= 22; // 考慮到節目播完加錄製時間，設為 22 點後才收錄

            if (!isToday || (isToday && isPassed)) {
                const y = d.getFullYear().toString();
                const m = (d.getMonth() + 1).toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                dates.push({
                    fmt: y + m + day,
                    utc: d.toUTCString()
                });
                count++;
            }
        }
        offset++;
        // 找 10 個週六大約需要 70 天，安全機制設為 100
        if (offset > 100) break;
    }

    // 2. 批量抓取與解析
    const fetchPromises = dates.map(async (dObj) => {
        const baseUrl = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const finalUrl = baseUrl + "?mychannel=radio1&mydate=" + dObj.fmt + "&mytime=2000";

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
                matches.push(match[1]); 
            }

            // 根據 RTHK 無障礙版慣例，第 3 個標籤通常是該集的主題 (如：張居正)
            if (matches.length >= 3) {
                episodeName = matches[2];
            } else if (matches.length > 0) {
                episodeName = matches[matches.length - 1];
            }

            // 清理標題文字
            if (episodeName) {
                episodeName = episodeName.replace("古今風雲人物", "").replace("第一台", "").trim();
            }

            const displayTitle = (episodeName && episodeName.length > 0) ? episodeName : "週六版";
            const finalTitle = "古今風雲人物：" + displayTitle + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[歷史人物專題：" + displayTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>抓取失敗 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

    const feedItems = await Promise.all(fetchPromises);

    const rss = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
                '<rss version="2.0">\n' +
                '<channel>\n' +
                '  <title>香港電台：古今風雲人物</title>\n' +
                '  <link>https://rthk.hk</link>\n' +
                '  <description>自動生成：最近 10 集週六重溫</description>\n' +
                '  ' + feedItems.join('\n') + '\n' +
                '</channel>\n' +
                '</rss>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(rss);
}
