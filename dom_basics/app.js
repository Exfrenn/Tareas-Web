"use strict"
import express from 'express'
import fs from 'fs'
import path from 'path'

const app = express()
const PORT = 3000

// Middleware 
app.use(express.json())
app.use(express.static('./public'))

let itemsCatalog = []
let nextId = 1

app.get('/', (req, res) => {
    res.sendFile(path.resolve('public/html/Hello_Server.html'));
  });
  
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });

// POST /api/items 
app.post('/api/items', (req, res) => {
  const { name, type, effect } = req.body
  if (!name || !type || !effect) {
    return res.status(400).json({ message: "Faltan name, type o effect" })
  }
  if (itemsCatalog.some(item => item.name === name)) {
    return res.status(409).json({ message: "Ese item ya existe" })
  }
  const newItem = { id: nextId++, name, type, effect }
  itemsCatalog.push(newItem)
  res.status(201).json(newItem)
})

// GET /api/items 
app.get('/api/items', (req, res) => {
  if (itemsCatalog.length === 0) {
    return res.status(202).json({ message: "No items found" })
  }
  res.status(200).json(itemsCatalog)
})

// GET /api/items/:id 
app.get('/api/items/:id', (req, res) => {
  const itemId = +req.params.id
  const item = itemsCatalog.find(i => i.id === itemId)
  if (!item) {
    return res.status(404).json({ message: "Item not found" })
  }
  res.json(item)
})

// DELETE /api/items/:id
app.delete('/api/items/:id', (req, res) => {
  const itemId = +req.params.id
  const index = itemsCatalog.findIndex(i => i.id === itemId)
  if (index === -1) {
    return res.status(404).json({ message: "Item not found" })
  }
  itemsCatalog.splice(index, 1)
  res.json({ message: "Item deleted successfully" })
})

// PUT /api/items/:id 
app.put('/api/items/:id', (req, res) => {
  const itemId = +req.params.id
  const { name, type, effect } = req.body
  const item = itemsCatalog.find(i => i.id === itemId)
  if (!item) {
    return res.status(404).json({ message: "Item not found" })
  }
  if (name)   item.name   = name
  if (type)   item.type   = type
  if (effect) item.effect = effect
  res.json(item)
})
// Middlewares
app.use(express.json())
app.use(express.static('./public'))

       
let usersCatalog = []
let nextUserId = 1

// POST /api/users 
app.post('/api/users', (req, res) => {
  const payload  = req.body
  const newUsers = Array.isArray(payload) ? payload : [payload]
  const created  = []
  const errors   = []

  newUsers.forEach(user => {
    const { name, email, items } = user

    if (!name || !email) {
      errors.push({ user, message: "Faltan name o email" })
      return
    }

    if (usersCatalog.some(u => u.email === email)) {
      errors.push({ user, message: `Email "${email}" ya registrado` })
      return
    }

    let userItemIds = []
    if (items !== undefined) {
      if (!Array.isArray(items)) {
        errors.push({ user, message: "Items debe ser un array de IDs" })
        return
      }
      const invalid = items.filter(id => !itemsCatalog.some(it => it.id === id))
      if (invalid.length) {
        errors.push({ user, message: `Items inválidos: ${invalid.join(', ')}` })
        return
      }
      userItemIds = [...items]
    }
    const newUser = { id: nextUserId++, name, email, items: userItemIds }
    usersCatalog.push(newUser)

    const newUserWithItems = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      items: newUser.items.map(itemId =>
        itemsCatalog.find(it => it.id === itemId)
      )
    }
    created.push({ user: newUserWithItems, message: "Usuario creado exitosamente" })
  })

  if (created.length && !errors.length)      return res.status(201).json({ created })
  if (!created.length && errors.length)      return res.status(400).json({ errors })
  return res.status(207).json({ created, errors })
})

// GET /api/users 
app.get('/api/users', (req, res) => {
  if (usersCatalog.length === 0) {
    return res.status(200).json({ message: "No hay usuarios" });
  }
  const result = usersCatalog.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    items: u.items.map(itemId =>
    itemsCatalog.find(it => it.id === itemId)
    )
  }));
  res.json(result);
});

// GET /api/users/:id →
app.get('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = usersCatalog.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no existe" });
  }
  const userWithItems = {
    id: user.id,
    name: user.name,
    email: user.email,
    items: user.items.map(itemId =>
      itemsCatalog.find(it => it.id === itemId)
    )
  };

  res.json(userWithItems);
});

// DELETE /api/users/:id 
app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = usersCatalog.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ message: "Usuario no existe" });
  }
  const [deletedUser] = usersCatalog.splice(idx, 1);
  const userWithItems = {
    id: deletedUser.id,
    name: deletedUser.name,
    email: deletedUser.email,
    items: deletedUser.items.map(itemId =>
      itemsCatalog.find(it => it.id === itemId)
    )
  };
  res.json({
    message: "Usuario borrado exitosamente",
    user: userWithItems
  });
});

// PUT /api/users/:id 
app.put('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = usersCatalog.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no existe" });
  }
  const { name, email, items } = req.body;

  if (email && usersCatalog.some(u => u.email === email && u.id !== id)) {
    return res.status(409).json({ message: "Email ya registrado" });
  }

  if (items !== undefined) {
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items debe ser un array de IDs" });
    }
    const invalid = items.filter(itemId => !itemsCatalog.some(it => it.id === itemId));
    if (invalid.length) {
      return res.status(400).json({ message: `Items inválidos: ${invalid.join(', ')}` });
    }
    user.items = [...items];
  }

  if (name)  user.name = name;
  if (email) user.email = email;

  const updatedUser = {
    id:    user.id,
    name:  user.name,
    email: user.email,
    items: user.items.map(itemId => itemsCatalog.find(it => it.id === itemId))
  };

  res.json(updatedUser);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

  