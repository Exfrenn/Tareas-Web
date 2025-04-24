"use strict";

import express from "express";
import fs from 'fs';

const port = 3000;
const app = express();

app.use(express.json());

app.use(express.static('./public'));

app.get('/', (req, res)=>{
    fs.readFile('./public/html/Hello_Server.html', 'utf8',
        (err,html)=>{
            if(err){
            res.status(500).send('There was an error: '
                +err)
                return
            }
            
            console.log("Sending page...")
            res.send(html)
            console.log("Page sent!")

        }
        
    )

})

app.get('/api/hello', (request, response)=>{
    response.json({
        message:"Hello from server" 
    })
})

app.get('/api/hello/:name',(req,res)=>{
    res.json({
        message: `Hello ${req.params.name} from server`
    })
})

app.get('/api/hello/:name/:surname',(req,res)=>{
    res.json({
        message: `Hello ${req.params.name} ${req.params.surname} from server`
    })
})

app.post('/api/recieve_data',(req,res)=>{
    const data = req.body
    console.log(req.body)

    res.send("Data recieved ")
})

app.listen(port, ()=> {console.log('App listening on port: ${port]')})