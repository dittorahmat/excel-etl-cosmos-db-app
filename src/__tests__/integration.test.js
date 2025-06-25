import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @vitest-environment jsdom
import { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
// Mock API client
const mockApi = {
    fetchItems: vi.fn().mockResolvedValue({
        items: [
            { id: 1, title: 'Item 1', completed: false },
            { id: 2, title: 'Item 2', completed: true },
        ],
    }),
    updateItem: vi.fn().mockImplementation((id, updates) => {
        // For new items (id is a timestamp)
        if (id > 1000) {
            return Promise.resolve({ ...updates, id });
        }
        // For existing items
        return Promise.resolve({ ...updates, id });
    }),
    deleteItem: vi.fn().mockResolvedValue({ success: true }),
    reset: () => {
        mockApi.fetchItems.mockResolvedValue({
            items: [
                { id: 1, title: 'Item 1', completed: false },
                { id: 2, title: 'Item 2', completed: true },
            ],
        });
        mockApi.updateItem.mockImplementation((id, updates) => {
            if (id > 1000) {
                return Promise.resolve({ ...updates, id });
            }
            return Promise.resolve({ ...updates, id });
        });
        mockApi.deleteItem.mockResolvedValue({ success: true });
    },
};
// Mock MSAL
vi.mock('@azure/msal-react', () => ({
    useMsal: () => ({
        instance: {
            acquireTokenSilent: vi.fn().mockResolvedValue({
                accessToken: 'test-token',
            }),
        },
        accounts: [
            {
                homeAccountId: 'test-account-id',
                environment: 'test',
                tenantId: 'test-tenant-id',
                username: 'test@example.com',
            },
        ],
    }),
    useIsAuthenticated: () => true,
    useAccount: vi.fn().mockReturnValue({
        homeAccountId: 'test-account-id',
        environment: 'test',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
    }),
}));
const TodoApp = () => {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTodo, setNewTodo] = useState('');
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchTodos = async () => {
            try {
                const response = await mockApi.fetchItems();
                setTodos(response.items);
            }
            catch (err) {
                setError('Failed to load todos');
            }
            finally {
                setLoading(false);
            }
        };
        fetchTodos();
    }, []);
    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTodo.trim())
            return;
        const newItem = {
            id: Date.now(),
            title: newTodo.trim(),
            completed: false,
        };
        try {
            const result = await mockApi.updateItem(newItem.id, newItem);
            setTodos(prevTodos => [...prevTodos, result]);
            setNewTodo('');
        }
        catch (err) {
            console.error('Error adding todo:', err);
            setError('Failed to add todo');
        }
    };
    const toggleTodo = async (id) => {
        const todo = todos.find(t => t.id === id);
        if (!todo)
            return;
        const updated = { ...todo, completed: !todo.completed };
        try {
            const result = await mockApi.updateItem(id, updated);
            setTodos(prevTodos => prevTodos.map(t => (t.id === id ? { ...t, ...result } : t)));
        }
        catch (err) {
            console.error('Error toggling todo:', err);
            setError('Failed to update todo');
        }
    };
    const deleteTodo = async (id) => {
        try {
            await mockApi.deleteItem(id);
            setTodos(prevTodos => prevTodos.filter(t => t.id !== id));
        }
        catch (err) {
            console.error('Error deleting todo:', err);
            setError('Failed to delete todo');
        }
    };
    if (loading)
        return _jsx("div", { "data-testid": "loading", children: "Loading..." });
    if (error)
        return _jsx("div", { "data-testid": "error", children: error });
    return (_jsxs("div", { children: [_jsx("h1", { "data-testid": "app-title", children: "Todo App" }), _jsxs("form", { onSubmit: handleAddTodo, "data-testid": "add-form", children: [_jsx("input", { type: "text", value: newTodo, onChange: (e) => setNewTodo(e.target.value), placeholder: "Add a new todo", "data-testid": "todo-input" }), _jsx("button", { type: "submit", "data-testid": "add-button", children: "Add Todo" })] }), _jsx("div", { "data-testid": "todo-list", children: todos.map(todo => (_jsxs("div", { "data-testid": `todo-${todo.id}`, children: [_jsx("input", { type: "checkbox", checked: todo.completed, onChange: () => toggleTodo(todo.id), "data-testid": `toggle-${todo.id}` }), _jsx("span", { style: { textDecoration: todo.completed ? 'line-through' : 'none' }, "data-testid": `todo-text-${todo.id}`, children: todo.title }), _jsx("button", { onClick: () => deleteTodo(todo.id), "data-testid": `delete-${todo.id}`, children: "Delete" })] }, todo.id))) })] }));
};
describe('Todo App Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        mockApi.reset();
    });
    it('loads and displays todos', async () => {
        render(_jsx(TodoApp, {}));
        // Check loading state
        expect(screen.getByTestId('loading')).toBeInTheDocument();
        // Wait for todos to load
        const todoList = await screen.findByTestId('todo-list');
        expect(todoList).toBeInTheDocument();
        // Check if todos are rendered
        expect(screen.getByTestId('todo-1')).toHaveTextContent('Item 1');
        expect(screen.getByTestId('todo-2')).toHaveTextContent('Item 2');
    });
    it('adds a new todo', async () => {
        render(_jsx(TodoApp, {}));
        // Wait for initial load
        await screen.findByTestId('todo-list');
        // Mock the updateItem response for the new todo
        const newTodo = { id: 999, title: 'New Todo', completed: false };
        mockApi.updateItem.mockResolvedValueOnce(newTodo);
        // Add a new todo
        const input = screen.getByTestId('todo-input');
        const form = screen.getByTestId('add-form');
        fireEvent.change(input, { target: { value: 'New Todo' } });
        fireEvent.submit(form);
        // Check if API was called with correct data
        await waitFor(() => {
            expect(mockApi.updateItem).toHaveBeenCalledWith(expect.any(Number), // timestamp ID
            expect.objectContaining({
                title: 'New Todo',
                completed: false
            }));
        });
        // The new todo should be added to the list
        await waitFor(() => {
            expect(screen.getByTestId('todo-list')).toHaveTextContent('New Todo');
        });
    });
    it('toggles todo completion', async () => {
        render(_jsx(TodoApp, {}));
        // Wait for initial load
        await screen.findByTestId('todo-list');
        // Get the first todo's checkbox and initial state
        const checkbox = screen.getByTestId('toggle-1');
        const initialText = screen.getByTestId('todo-text-1');
        const initialDecoration = window.getComputedStyle(initialText).textDecoration;
        // Mock the updateItem response
        const updatedTodo = { id: 1, title: 'Item 1', completed: true };
        mockApi.updateItem.mockResolvedValueOnce(updatedTodo);
        // Toggle the checkbox
        fireEvent.click(checkbox);
        // Check if API was called with correct data
        await waitFor(() => {
            expect(mockApi.updateItem).toHaveBeenCalledWith(1, expect.objectContaining({
                id: 1,
                completed: true
            }));
        });
        // The todo should be marked as completed
        await waitFor(() => {
            const todoText = screen.getByTestId('todo-text-1');
            const newDecoration = window.getComputedStyle(todoText).textDecoration;
            expect(newDecoration).not.toBe(initialDecoration);
        });
    });
    it('deletes a todo', async () => {
        render(_jsx(TodoApp, {}));
        // Wait for initial load
        await screen.findByTestId('todo-list');
        // Delete the first todo
        const deleteButton = screen.getByTestId('delete-1');
        fireEvent.click(deleteButton);
        // Check if API was called
        await waitFor(() => {
            expect(mockApi.deleteItem).toHaveBeenCalledWith(1);
        });
        // The todo should be removed from the list
        await waitFor(() => {
            expect(screen.queryByTestId('todo-1')).not.toBeInTheDocument();
        });
    });
});
