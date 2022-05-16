const express = require('express');
const { randomUUID } = require('node:crypto');

const app = express();

app.use(express.json());

const costumers = [];

function verifyIfAccountExistsByCPF(request, response, next) {
    const {cpf} = request.headers;

    const costumer = costumers.find(costumer => costumer.cpf === cpf);

    if(!costumer) {
        return response.status(400).json({error: "Customer not found"})
    }

    request.customer = costumer;

    return next();
}

function getBalance(statement){
    return statement.reduce((acc, operation) => {
        if(operation.type === "credit"){
            return acc + operation.amount;
        }else{
            return acc - operation.amount;
        }
    }, 0)
}


app.post("/accounts", (request, response) => {
    const {cpf, name} = request.body;

    const id = randomUUID();

    const cpfAlreadyExists = costumers.some(costumer => costumer.cpf === cpf);

    if(cpfAlreadyExists){
       return response.status(400).json({error: "Cpf already exists!"})
    }

    const costumer = {
        id,
        cpf,
        name,
        statement: []
    }



    costumers.push(costumer);

    return response.status(201).json(costumer);
});

app.get("/statement", verifyIfAccountExistsByCPF, (request, response) => {
    const {customer} = request;

    return response.json(customer.statement);
})

app.post("/deposit", verifyIfAccountExistsByCPF,(request, response) => {
    const {description, amount} = request.body;

    const {customer} = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.post("/withdraw", verifyIfAccountExistsByCPF, (request, response) => {
    const {amount} = request.body;
    const {customer} = request;

    const balance = getBalance(customer.statement);

    if(amount > balance){
        return response.status(400).json({error: "Insufficient funds!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.get("/statement/date", verifyIfAccountExistsByCPF, (request, response) => {
    const {customer} = request;
    const {date} = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter((statement) => {
        return statement.created_at.toDateString() === new Date(dateFormat).toDateString();
    })

    return response.json(statement)
});

app.put("/accounts", verifyIfAccountExistsByCPF, (request, response) => {
    const {name} = request.body;
    const {customer} = request;

    customer.name = name;

    return response.send();
});

app.get("/accounts", verifyIfAccountExistsByCPF, (request, response) => {
    const {customer} = request;

    return response.json(customer);
})

app.delete("/accounts", verifyIfAccountExistsByCPF, (request, response) => {
    const {customer} = request;

    const customerIndex = costumers.findIndex((customerIndex) => {
        return customerIndex.id === customer.id
    });

    costumers.splice(customerIndex, 1);

    return response.send();
})

app.get("/balance", verifyIfAccountExistsByCPF, (request, response) => {
    const {customer} = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
})

app.listen(3333);