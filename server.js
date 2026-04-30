const express = require('express')
const app = express()
let votesMock = {}

app.use(express.static('public'))
app.use(express.json()) 

app.get('/front', (req, res) => {
    const imageUrl = req.query.url

    if (!imageUrl) {
        return res.status(400).json({ error: 'missing url' });
    }

    if (votesMock[imageUrl]) {
        return res.json(votesMock[imageUrl])
    }

    return res.json({
        real: 0,
        ai: 0
    })
})


app.post('/vote', (req, res) => {
    const { url, voteType } = req.body

    if (!url || !voteType) {
        return res.status(400).json({ error: 'missing url or voteType' })
    }

    
    if (!votesMock[url]) {
        votesMock[url] = { real: 0, ai: 0 }
    }

    if (voteType === 'ai') {
        votesMock[url].ai++
    } else if (voteType === 'real') {
        votesMock[url].real++
    } else {
        return res.status(400).json({ error: 'invalid voteType' })
    }

    return res.json(votesMock[url])
})

const port = 3000
app.listen(port, () => {
    console.log(`server running on http://localhost:${port}`)
})