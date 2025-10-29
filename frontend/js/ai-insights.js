// AI Insights JavaScript for NexusCare
const API_BASE_URL = 'http://localhost:8000/api';

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Logout function
function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
}

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Load user info
function loadUserInfo() {
    const userEmail = localStorage.getItem('userEmail');
    document.getElementById('userEmail').textContent = userEmail || 'User';
}

// Analyze symptoms
document.getElementById('symptomForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const symptoms = document.getElementById('symptomsInput').value.trim();

    if (!symptoms) {
        showSymptomAlert('Please enter your symptoms');
        return;
    }

    setSymptomLoading(true);
    document.getElementById('symptomAlert').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/ai/specialist/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: symptoms })
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            displaySymptomResults(data);
        } else {
            showSymptomAlert(data.detail || data.error || 'Analysis failed. Please try again.');
        }
    } catch (error) {
        console.error('Analysis error:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showSymptomAlert('Cannot connect to server. Please ensure the backend is running and CORS is configured.');
        } else {
            showSymptomAlert('Network error. Please try again.');
        }
    } finally {
        setSymptomLoading(false);
    }
});

// Display symptom analysis results
function displaySymptomResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    const specialistDiv = document.getElementById('recommendedSpecialist');
    const confidenceDiv = document.getElementById('confidenceScore');
    const alternativesDiv = document.getElementById('alternativeSpecialists');

    // Recommended specialist
    if (data.specialist || data.predicted_specialist) {
        const specialist = data.specialist || data.predicted_specialist;
        const confidence = data.confidence || data.confidence_score || 0;

        specialistDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">
                    ${getSpecialistIcon(specialist)}
                </div>
                <h2 style="color: var(--primary-blue); margin-bottom: 0.5rem;">
                    ${escapeHtml(specialist)}
                </h2>
                <p style="color: var(--text-secondary);">
                    Recommended specialist based on your symptoms
                </p>
            </div>
        `;

        confidenceDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="flex: 1;">
                    <div style="background: var(--bg-light); border-radius: 10px; height: 20px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, var(--accent-teal), var(--primary-blue)); 
                                    height: 100%; width: ${Math.round(confidence * 100)}%; 
                                    transition: width 0.5s ease;"></div>
                    </div>
                </div>
                <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-blue); min-width: 60px;">
                    ${Math.round(confidence * 100)}%
                </div>
            </div>
            <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.9rem;">
                ${getConfidenceMessage(confidence)}
            </p>
        `;

        // Alternative specialists
        if (data.alternatives && data.alternatives.length > 0) {
            alternativesDiv.innerHTML = `
                <h4 style="margin-bottom: 1rem;">Alternative Specialists:</h4>
                <div style="display: grid; gap: 1rem;">
                    ${data.alternatives.slice(0, 3).map(alt => `
                        <div style="display: flex; justify-content: space-between; align-items: center; 
                                    padding: 1rem; background: var(--bg-light); border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="font-size: 2rem;">${getSpecialistIcon(alt.specialist || alt.name)}</span>
                                <span style="font-weight: 500;">${escapeHtml(alt.specialist || alt.name)}</span>
                            </div>
                            <span style="color: var(--text-secondary);">
                                ${Math.round((alt.confidence || alt.score || 0) * 100)}%
                            </span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            alternativesDiv.innerHTML = '<p style="color: var(--text-secondary);">No alternatives available</p>';
        }

        resultsSection.classList.remove('hidden');
        
        // Smooth scroll to results
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        showSymptomAlert('No specialist recommendation available. Please try rephrasing your symptoms.');
    }
}

// Generate medical summary
document.getElementById('summaryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = document.getElementById('summaryInput').value.trim();

    if (!text) {
        showSummaryAlert('Please enter medical text to summarize');
        return;
    }

    setSummaryLoading(true);
    document.getElementById('summaryAlert').classList.add('hidden');
    document.getElementById('summaryOutput').innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/ai/summary/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: text })
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            displaySummaryResults(data);
        } else {
            showSummaryAlert(data.detail || data.error || 'Summary generation failed. Please try again.');
        }
    } catch (error) {
        console.error('Summary error:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showSummaryAlert('Cannot connect to server. Please ensure the backend is running and CORS is configured.');
        } else {
            showSummaryAlert('Network error. Please try again.');
        }
    } finally {
        setSummaryLoading(false);
    }
});

// Display summary results
function displaySummaryResults(data) {
    const outputDiv = document.getElementById('summaryOutput');

    let content = '';

    // Summary text
    if (data.summary) {
        content += `
            <div class="summary-card">
                <h4>📝 Summary</h4>
                <p style="line-height: 1.6; color: var(--text-primary);">
                    ${escapeHtml(data.summary)}
                </p>
            </div>
        `;
    }

    // Key points
    if (data.key_points && data.key_points.length > 0) {
        content += `
            <div class="summary-card">
                <h4>🎯 Key Points</h4>
                <ul style="margin: 0; padding-left: 1.5rem; line-height: 1.8;">
                    ${data.key_points.map(point => `
                        <li>${escapeHtml(point)}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // Extracted entities
    if (data.entities && Object.keys(data.entities).length > 0) {
        content += `
            <div class="summary-card">
                <h4>🏷️ Extracted Entities</h4>
                <div style="display: grid; gap: 1rem; margin-top: 1rem;">
                    ${Object.entries(data.entities).map(([type, items]) => `
                        <div>
                            <strong style="color: var(--primary-blue); text-transform: capitalize;">
                                ${escapeHtml(type)}:
                            </strong>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                                ${items.map(item => `
                                    <span class="entity-tag">${escapeHtml(item)}</span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Conditions/Diagnoses
    if (data.conditions && data.conditions.length > 0) {
        content += `
            <div class="summary-card">
                <h4>🩺 Conditions/Diagnoses</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                    ${data.conditions.map(condition => `
                        <span class="condition-tag">${escapeHtml(condition)}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Medications
    if (data.medications && data.medications.length > 0) {
        content += `
            <div class="summary-card">
                <h4>💊 Medications</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                    ${data.medications.map(med => `
                        <span class="medication-tag">${escapeHtml(med)}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (content) {
        outputDiv.innerHTML = content;
        // Smooth scroll to output
        setTimeout(() => {
            outputDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        showSummaryAlert('No summary content available. Please try with different text.');
    }
}

// Alert functions
function showSymptomAlert(message, type = 'error') {
    const alertDiv = document.getElementById('symptomAlert');
    const alertText = document.getElementById('symptomAlertText');

    alertDiv.className = `alert alert-${type}`;
    alertText.textContent = message;
    alertDiv.classList.remove('hidden');
}

function showSummaryAlert(message, type = 'error') {
    const alertDiv = document.getElementById('summaryAlert');
    const alertText = document.getElementById('summaryAlertText');

    alertDiv.className = `alert alert-${type}`;
    alertText.textContent = message;
    alertDiv.classList.remove('hidden');
}

// Loading states
function setSymptomLoading(isLoading) {
    const btn = document.getElementById('analyzeBtn');
    const spinner = document.getElementById('analyzeSpinner');
    const text = document.getElementById('analyzeBtnText');

    btn.disabled = isLoading;
    if (isLoading) {
        spinner.classList.remove('hidden');
        text.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        text.classList.remove('hidden');
    }
}

function setSummaryLoading(isLoading) {
    const btn = document.getElementById('generateBtn');
    const spinner = document.getElementById('generateSpinner');
    const text = document.getElementById('generateBtnText');

    btn.disabled = isLoading;
    if (isLoading) {
        spinner.classList.remove('hidden');
        text.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        text.classList.remove('hidden');
    }
}

// Utility functions
function getSpecialistIcon(specialist) {
    const icons = {
        'cardiologist': '❤️',
        'cardiology': '❤️',
        'dermatologist': '🧴',
        'dermatology': '🧴',
        'neurologist': '🧠',
        'neurology': '🧠',
        'orthopedist': '🦴',
        'orthopedics': '🦴',
        'pediatrician': '👶',
        'pediatrics': '👶',
        'psychiatrist': '🧘',
        'psychiatry': '🧘',
        'ophthalmologist': '👁️',
        'ophthalmology': '👁️',
        'ent': '👂',
        'gastroenterologist': '🫁',
        'gastroenterology': '🫁',
        'general': '🩺',
        'general medicine': '🩺'
    };
    
    const key = specialist.toLowerCase();
    for (const [specialty, icon] of Object.entries(icons)) {
        if (key.includes(specialty)) {
            return icon;
        }
    }
    return '👨‍⚕️';
}

function getConfidenceMessage(confidence) {
    if (confidence >= 0.9) return 'Very high confidence in this recommendation';
    if (confidence >= 0.75) return 'High confidence - good match for your symptoms';
    if (confidence >= 0.6) return 'Moderate confidence - consider alternatives too';
    return 'Lower confidence - please consult with a general practitioner';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
if (checkAuth()) {
    document.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
        
        // Add example symptoms helper
        const examplesDiv = document.createElement('div');
        examplesDiv.style.cssText = 'margin-top: 1rem; padding: 1rem; background: var(--bg-light); border-radius: 8px;';
        examplesDiv.innerHTML = `
            <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">Example symptoms:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                <button type="button" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" 
                        onclick="document.getElementById('symptomsInput').value = 'severe chest pain, shortness of breath, rapid heartbeat'">
                    Chest pain example
                </button>
                <button type="button" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;"
                        onclick="document.getElementById('symptomsInput').value = 'skin rash, itching, redness on arms and legs'">
                    Skin issues example
                </button>
                <button type="button" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;"
                        onclick="document.getElementById('symptomsInput').value = 'persistent headache, dizziness, sensitivity to light'">
                    Neurological example
                </button>
            </div>
        `;
        
        const symptomForm = document.getElementById('symptomForm');
        if (symptomForm) {
            symptomForm.parentElement.insertBefore(examplesDiv, symptomForm.nextSibling);
        }
    });
}
