export default async function handler(req, res) {
    const now = new Date();
    const dates = [];

    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay(); 
        d.setDate(now.getDate() - dayOffset - (i * 7));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push({ fmt: "" + y + m + day, utc: d.toUTCString() });
    }

    const fetchPromises = dates.map(async (dObj) => {
        const baseUrl = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const finalUrl = baseUrl + "?mychannel=radio1&mydate=" + dObj.fmt + "&mytime=1000";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const html = await response.text();
            
            let episodeTitle = "";
            // 针对 player_txt.php 的特殊提取逻辑
            // 标题通常在 class="prog_title" 之后，被 <a> 标签包围
            if (html.indexOf('class="prog_title"') !== -1) {
                const temp = html.split('class="prog_title"')[1];
                // 找到第一个 </div> 结束前的所有内容
                const rawTitleArea = temp.split('</div>')[0];
                // 彻底剥离所有 HTML 标签（包括 <a> 和 <span>）
                episodeTitle = rawTitleArea.replace(/<[^>]*>?/gm, '').replace(/[>]/g, '').trim();
            }

            if (!episodeTitle || episodeTitle.length < 2) {
                // 如果还是抓不到，尝试第二种可能的路径：抓取网页 title 标签
                const metaTitle = html.match(/<title>([\s\S]*?)<\/title>/i);
                episodeTitle = metaTitle ? metaTitle[1].split('|')[1] || metaTitle[1] : dObj.fmt;
            }

            // 最终标题格式：[节目名称] (日期)
            const finalTitle = episodeTitle.replace("香港電台網站 : 第一台", "").trim() + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[講東講西週日版重溫 - " + dObj.fmt + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>講東講西 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
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
