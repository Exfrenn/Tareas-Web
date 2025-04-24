async function main() {
    
    const response = await fetch('http://localhost:3000/api/hello/Efren');

    const message = await response.json();

    console.log(response);
    console.log(message);

    const data = {
        id:1,
        name:'sword',
        effect :"deals dammage"
    }

    const response_r = await fetch ('http://localhost:3000/api/recieve_data',{
        method : 'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
    })

    console.log(response_r)
}

main()