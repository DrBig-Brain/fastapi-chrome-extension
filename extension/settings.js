document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settings-form');
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model-select');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const status = document.getElementById('status');
    const modelCards = document.querySelectorAll('.model-card');
    
    // Load existing settings
    chrome.storage.local.get(['geminiApiKey', 'geminiModel'], function(result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
        if (result.geminiModel) {
            modelSelect.value = result.geminiModel;
        } else {
            modelSelect.value = 'gemini-2.5-flash'; // Default to 2.5 Flash
        }
        updateModelCardSelection();
    });
    
    // Update model card visual selection
    function updateModelCardSelection() {
        const selectedModel = modelSelect.value;
        modelCards.forEach(card => {
            if (card.dataset.model === selectedModel) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }
    
    // Model selection change
    modelSelect.addEventListener('change', updateModelCardSelection);
    
    // Model card click
    modelCards.forEach(card => {
        card.addEventListener('click', function() {
            modelSelect.value = this.dataset.model;
            updateModelCardSelection();
        });
    });
    
    // Show status message
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        }
    }
    
    // Validate API key format
    function isValidApiKey(key) {
        return key && key.trim().length > 20 && key.startsWith('AIza');
    }
    
    // Get model description
    function getModelDescription(model) {
        const descriptions = {
            'gemini-2.5-flash': 'Best price-performance with adaptive thinking',
            'gemini-2.5-pro': 'Most advanced model with enhanced reasoning',
            'gemini-2.5-flash-lite': 'Most cost-efficient with high throughput',
            'gemini-2.0-flash': 'Next-gen features with superior speed',
            'gemini-2.0-flash-lite': 'Cost-efficient with low latency',
            'gemini-1.5-pro': 'Stable legacy model for complex reasoning',
            'gemini-1.5-flash': 'Fast legacy model for versatile performance',
            'gemini-1.5-flash-8b': 'Lightweight model for high volume tasks'
        };
        return descriptions[model] || 'Advanced language model';
    }
    
    // Save settings
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        
        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }
        
        if (!isValidApiKey(apiKey)) {
            showStatus('Invalid API key format. Gemini API keys start with "AIza" and are longer than 20 characters.', 'error');
            return;
        }
        
        if (!selectedModel) {
            showStatus('Please select a model', 'error');
            return;
        }
        
        // Save to storage
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        chrome.storage.local.set({ 
            geminiApiKey: apiKey,
            geminiModel: selectedModel 
        }, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Settings';
            } else {
                const modelDesc = getModelDescription(selectedModel);
                showStatus(`Settings saved! Using ${selectedModel} (${modelDesc})`, 'success');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Settings';
                
                // Close window after success
                setTimeout(() => {
                    window.close();
                }, 2000);
            }
        });
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', function() {
        window.close();
    });
    
    // Input validation on type
    apiKeyInput.addEventListener('input', function() {
        const apiKey = this.value.trim();
        
        if (apiKey && !isValidApiKey(apiKey)) {
            this.style.borderColor = '#dc3545';
        } else {
            this.style.borderColor = '#ddd';
        }
    });
    
    // Focus on input when opened
    apiKeyInput.focus();
    
    // Initial model card selection
    updateModelCardSelection();
});
