const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt-nodejs');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'admin',
        database: 'smart-brain'
    }
});



const app = express();

app.use(express.json());
app.use(cors());


// root
app.get('/', (req, res) => {
    res.send('success');
})



// sign in
app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);

            if (isValid) {
                return db.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then(user => {
                        res.json(user[0]);
                    })
                    .catch(err => res.status(400).json('unable to get user'))
            }
            else {
                res.status(400).json('wrong credentials')
            }
        })
        .catch(err => res.status(400).json('wrong credentials'))


})

// register
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const hash = bcrypt.hashSync(password);

    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        }).into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        name: name,
                        email: loginEmail[0].email,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
    })

        .catch(err => {
            res.status(400).json('unable to register');
        })

})

//get profile
app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where({
        id: id
    }).then(user => {
        if (user.length) {
            res.json(user[0]);
        }
        else {
            res.status(400).json('user not found');
        }
    }).catch(err => {
        res.status(400).json('error getting user');
    })


})


//image entries

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0].entries);
        })
        .catch(err => {
            res.status(400).json('unable to get entries');
        })
})



app.listen(3000, () => {
    console.log("server is listening to port 3000");
})


