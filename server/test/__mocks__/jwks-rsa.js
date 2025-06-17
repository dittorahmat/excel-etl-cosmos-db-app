// Mock for jwks-rsa library
export default jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn((kid, callback) => {
        // Mock a valid key
        if (kid === 'test-key-id') {
            callback(null, {
                getPublicKey: () => 'test-public-key',
            });
        }
        else {
            // Simulate key not found
            callback(new Error('Key not found'), null);
        }
    }),
}));
