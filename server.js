const express = require('express')
const app = express()

app.use(express.static('public'));

app.get('/front' , (req, res) => {
    const imageUrl = req.query.url;

    if(!imageUrl){
        return res.status(400).json({ error: 'missing url'})
    }
    res.json({
        real: 10,
        ai: 2
    })
})

const port = 3000
app.listen(port, () => {
    console.log(`server running on http://localhost:${port}`)
})