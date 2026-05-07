const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const votesMock = {
    "test": { real: 10, ai: 40, votedIPs: [] },
    "image123": { real: 5, ai: 5, votedIPs: ['127.0.0.1'] }
};

app.get('/front', (req, res) => {
    const url = req.query.url;

    if (!url || !votesMock[url]) {
        return res.status(404).json({ error: 'URL not found in database' });
    }

    let data = votesMock[url];
    let total = data.real + data.ai;

    let aiPercentage = total === 0 ? 0 : (data.ai / total) * 100;
    let realPercentage = total === 0 ? 0 : (data.real / total) * 100;

    let mostVoted = "Tie"; 
    if (data.ai > data.real) mostVoted = "AI";
    if (data.real > data.ai) mostVoted = "Real";

    res.json({
        url: url,
        totalVotes: total,
        aiPercentage: aiPercentage,
        realPercentage: realPercentage,
        mostVoted: mostVoted
    });
});

app.post('/vote', (req, res) => {
    const { url, vote } = req.body;
    const userIP = req.ip;

    if (!votesMock[url]) {
        votesMock[url] = { real: 0, ai: 0, votedIPs: [] };
    }

    if (votesMock[url].votedIPs.includes(userIP)) {
        return res.status(403).json({ error: "כבר הצבעת לתמונה זו!" });
    }

    if (vote === true || vote === "true") {
        votesMock[url].ai += 1;
    } else {
        votesMock[url].real += 1;
    }

    votesMock[url].votedIPs.push(userIP);

    console.log(`New vote for ${url} from IP ${userIP}`);
    res.json({ status: "success", message: "הצבעתך התקבלה!" });
});

const port = 3000;
app.listen(port, () => {
    console.log(`server running on http://localhost:${port}`)
});
