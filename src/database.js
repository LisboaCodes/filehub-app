const Store = require('electron-store');

class SessionDatabase {
  constructor() {
    this.store = new Store({
      name: 'filehub-data',
      defaults: {
        categories: [],
        sessions: [],
        nextCategoryId: 1,
        nextSessionId: 1
      }
    });
  }

  initialize() {
    // Inserir categorias padrao se nao existirem
    const categories = this.store.get('categories');
    if (categories.length === 0) {
      const defaultCategories = [
        { id: 1, name: 'IA', icon: '🤖', created_at: new Date().toISOString() },
        { id: 2, name: 'Produtividade', icon: '📊', created_at: new Date().toISOString() },
        { id: 3, name: 'Redes Sociais', icon: '📱', created_at: new Date().toISOString() },
        { id: 4, name: 'Outros', icon: '📁', created_at: new Date().toISOString() }
      ];
      this.store.set('categories', defaultCategories);
      this.store.set('nextCategoryId', 5);
    }
  }

  // === CATEGORIES ===
  getCategories() {
    return this.store.get('categories');
  }

  addCategory(category) {
    const categories = this.store.get('categories');
    const id = this.store.get('nextCategoryId');

    const newCategory = {
      id,
      name: category.name,
      icon: category.icon || '📁',
      created_at: new Date().toISOString()
    };

    categories.push(newCategory);
    this.store.set('categories', categories);
    this.store.set('nextCategoryId', id + 1);

    return newCategory;
  }

  updateCategory(id, category) {
    const categories = this.store.get('categories');
    const index = categories.findIndex(c => c.id === id);

    if (index !== -1) {
      categories[index] = {
        ...categories[index],
        name: category.name,
        icon: category.icon
      };
      this.store.set('categories', categories);
    }

    return { id, ...category };
  }

  deleteCategory(id) {
    let categories = this.store.get('categories');
    categories = categories.filter(c => c.id !== id);
    this.store.set('categories', categories);

    // Atualiza sessoes que usam essa categoria
    let sessions = this.store.get('sessions');
    sessions = sessions.map(s => {
      if (s.category_id === id) {
        return { ...s, category_id: null, category_name: null, category_icon: null };
      }
      return s;
    });
    this.store.set('sessions', sessions);

    return { changes: 1 };
  }

  // === SESSIONS ===
  getSessions() {
    const sessions = this.store.get('sessions');
    const categories = this.store.get('categories');

    return sessions.map(session => {
      const category = categories.find(c => c.id === session.category_id);
      return {
        ...session,
        category_name: category ? category.name : null,
        category_icon: category ? category.icon : null
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  getSessionsByCategory(categoryId) {
    const allSessions = this.getSessions();

    if (categoryId === null || categoryId === 'all') {
      return allSessions;
    }

    return allSessions.filter(s => s.category_id === categoryId);
  }

  addSession(session) {
    const sessions = this.store.get('sessions');
    const id = this.store.get('nextSessionId');

    const newSession = {
      id,
      name: session.name,
      url: session.url,
      description: session.description || '',
      cover_image: session.cover_image || '',
      category_id: session.category_id ? parseInt(session.category_id) : null,
      cookies: typeof session.cookies === 'string' ? session.cookies : JSON.stringify(session.cookies || []),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    sessions.push(newSession);
    this.store.set('sessions', sessions);
    this.store.set('nextSessionId', id + 1);

    return newSession;
  }

  updateSession(id, session) {
    const sessions = this.store.get('sessions');
    const index = sessions.findIndex(s => s.id === id);

    if (index !== -1) {
      sessions[index] = {
        ...sessions[index],
        name: session.name,
        url: session.url,
        description: session.description || '',
        cover_image: session.cover_image || '',
        category_id: session.category_id ? parseInt(session.category_id) : null,
        cookies: typeof session.cookies === 'string' ? session.cookies : JSON.stringify(session.cookies || []),
        updated_at: new Date().toISOString()
      };
      this.store.set('sessions', sessions);
    }

    return { id, ...session };
  }

  deleteSession(id) {
    let sessions = this.store.get('sessions');
    sessions = sessions.filter(s => s.id !== id);
    this.store.set('sessions', sessions);

    return { changes: 1 };
  }
}

module.exports = SessionDatabase;
