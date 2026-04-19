export default function handler(req, res) {
    const now = new Date();
    const fetchPromises = [];

    // 获取最近 5 个周日的日期
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay() === 0 ? 0 : now.getDay();
        d.setDate(now.getDate() - dayOffset - (i * 7));
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const formattedDate = `${year}${month}${date}`;
        
        const baseUrl = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const finalUrl = `${baseUrl}?mychannel=radio1&mydate=${formattedDate}&mytime=1000`;
        const pubDate = d.toUTCString();

        // 建立异步抓取任务：去 RTHK 页面拿标题
        fetchPromises.push(
            fetch(finalUrl)
                .then(response => response.text())
                .then(html => {
                    // 使用正则提取 <div class="prog_title">...</div> 中的标题
                    const titleMatch = html.match(/<div class="prog_title">([\s\S]*?)<\/div>/);
                    // 如果没抓到标题，就用日期保底
                    const episodeName = titleMatch ? titleMatch[1].replace(/<(?:.|\n)*?>/gm, '').trim() : `講東講西 (${formattedDate})`;
                    
                    return `
                    <item>
                        <title>${episodeName}</title>
                        <link>${finalUrl.replace(/&/g, '&amp;')}</link>
                        <guid isPermaLink="true">${finalUrl.replace(/&/g, '&amp;')}</guid>
                        <pubDate>${pubDate}</pubDate>
                        <description>點擊訪問 RTHK 無障礙版重溫內容 (${formattedDate})</description>
                    </item>`;
                })
                .catch(() => `
                    <item>
                        <title>講東講西 - 週日版 (${formattedDate})</title>
                        <link>${finalUrl.replace(/&/g, '&amp;')}</link>
                        <guid isPermaLink="true">${finalUrl.replace(/&/g, '&amp;')}</guid>
                        <pubDate>${pubDate}</pubDate>
                        <description>抓取標題失敗，請點擊連結查看。</description>
                    </item>`)
        );
    }

    // 等所有页面都抓取完后再输出 RSS
    Promise.all(fetchPromises).then(items => {
        const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>香港電台：講東講西 - 週日版</title>
    <link>https://rthk.hk</link>
    <description>Vercel 自動抓取標題版：講東講西週日版重溫</description>
    ${items.join('\n')}
</channel>
</rss>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(rss);
    });
}
