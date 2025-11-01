// AI Insights JavaScript for NexusCare
const API_BASE_URL = "http://localhost:8000/api";

// Example texts for buttons
const exampleTexts = {
  chest1:
    "I have sharp chest pain on my left side that started 2 hours ago. It gets worse when I breathe deeply or cough. Also feeling short of breath and sweating.",
  skin1:
    "I have a red, itchy rash on my arms and legs that appeared 3 days ago. The affected areas are slightly swollen and warm to touch. No fever but very uncomfortable.",
  neuro1:
    "Severe throbbing headache on the right side of my head for 6 hours. Sensitive to light and sound. Feeling nauseous and have had two episodes of vomiting.",
};

// Check authentication

// Fill example text into symptoms textarea
function fillSimpleExample(exampleKey) {
  const textarea = document.getElementById("symptoms");

  if (!textarea) {
    console.error("Symptoms textarea not found!");
    return;
  }

  if (!exampleTexts[exampleKey]) {
    console.error("Example text not found for key:", exampleKey);
    return;
  }

  textarea.value = exampleTexts[exampleKey];

  // Highlight the textarea briefly
  textarea.style.borderColor = "var(--accent-teal)";
  textarea.style.boxShadow = "0 0 0 4px rgba(0, 217, 181, 0.15)";
  setTimeout(() => {
    textarea.style.borderColor = "";
    textarea.style.boxShadow = "";
  }, 1000);

  // Scroll to textarea
  textarea.scrollIntoView({ behavior: "smooth", block: "center" });
  textarea.focus();
}

// Initialize examples section visibility
function initializeExamplesSection() {
  const hasClosed = localStorage.getItem("aiInsightsExamplesClosed");
  const wrapper = document.getElementById("exampleSymptomsWrapper");

  if (wrapper) {
    if (hasClosed === "true") {
      wrapper.style.display = "none";
    } else {
      wrapper.style.display = "block";
    }
  }
}

// Check authentication
function checkAuth() {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Logout function
function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "index.html";
}

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Load user info
function loadUserInfo() {
  const userEmail = localStorage.getItem("userEmail");
  const userName = localStorage.getItem("userName");
  const userPhoto = localStorage.getItem("userPhoto");

  // Update user name
  const navUserName = document.getElementById("navUserName");
  if (navUserName) {
    navUserName.textContent = userName || userEmail?.split("@")[0] || "User";
  }

  // Update user photo
  const navUserPhoto = document.getElementById("navUserPhoto");
  if (navUserPhoto && userPhoto) {
    navUserPhoto.src = userPhoto;
    navUserPhoto.style.display = "block";
    navUserPhoto.nextElementSibling.style.display = "none";
  } else if (navUserPhoto) {
    // Generate default avatar with user's initial
    const initial = (userName || userEmail || "U").charAt(0).toUpperCase();
    const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="#4F46E5"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-size="18" font-family="Inter, sans-serif" font-weight="600">
          ${initial}
        </text>
      </svg>
    `)}`;
    navUserPhoto.src = defaultAvatar;
    navUserPhoto.style.display = "block";
    navUserPhoto.nextElementSibling.style.display = "none";
  }
}

// Analyze symptoms
document
  .getElementById("symptomForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const symptoms = document.getElementById("symptoms").value.trim();

    if (!symptoms) {
      showSymptomAlert("Please enter your symptoms");
      return;
    }

    setSymptomLoading(true);
    document.getElementById("symptomAlert").classList.add("hidden");
    document.getElementById("resultsSection").classList.add("hidden");

    try {
      // New: read mode and model from UI (short/deep and auto/pytorch/sklearn)
      const uiMode = document.getElementById("analysisMode")?.value || "short";
      const model = document.getElementById("modelSelect")?.value || "auto";

      // Map UI mode to backend mode
      const mode = uiMode === "deep" ? "deep" : "quick";
      const include_history = uiMode === "deep" ? true : false;

      const response = await fetch(`${API_BASE_URL}/ai/analyze-enhanced/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          symptoms: symptoms,
          mode: mode,
          include_history: include_history,
          model: model,
        }),
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await response.json();

      if (response.ok) {
        // enhanced endpoint returns structured analysis under data.analysis
        if (data.mode) {
          // Convert enhanced response to legacy-friendly shape for displaySymptomResults
          const out = {};
          const analysis = data.analysis || {};
          out.specialist =
            analysis.recommended_specialist ||
            analysis.primary_recommendation ||
            null;
          out.confidence = analysis.confidence || 0;
          out.model_type = data.model || analysis.model_type || "auto";
          out.alternatives =
            analysis.top_predictions || data.recommendations || [];
          // Pass through entities if present
          out.entities =
            analysis.extracted_symptoms || analysis.extracted_entities || {};
          displaySymptomResults(out);
        } else {
          displaySymptomResults(data);
        }
      } else {
        showSymptomAlert(
          data.detail || data.error || "Analysis failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Analysis error:", error);
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        showSymptomAlert(
          "Cannot connect to server. Please ensure the backend is running and CORS is configured."
        );
      } else {
        showSymptomAlert("Network error. Please try again.");
      }
    } finally {
      setSymptomLoading(false);
    }
  });

// Display symptom analysis results
function displaySymptomResults(data) {
  const resultsSection = document.getElementById("resultsSection");
  const specialistSpan = document.getElementById("recommendedSpecialist");
  const confidenceSpan = document.getElementById("confidence");
  const modelBadge = document.getElementById("modelBadge");
  const modelDescription = document.getElementById("modelDescription");

  // Recommended specialist
  if (data.specialist || data.predicted_specialist) {
    const specialist = data.specialist || data.predicted_specialist;
    const confidence = data.confidence || data.confidence_score || 0;
    const modelType = data.model_type || "auto";

    // Update specialist name with icon
    specialistSpan.innerHTML = `
      ${getSpecialistIcon(specialist)} ${escapeHtml(specialist)}
    `;

    // Update confidence percentage
    confidenceSpan.textContent = `${Math.round(confidence * 100)}%`;

    // Display model type badge
    if (modelBadge) {
      const modelIcons = {
        pytorch: "🧠",
        sklearn: "⚡",
        legacy: "🤖",
        fallback: "🔄",
      };
      const modelNames = {
        pytorch: "PyTorch (Deep Learning)",
        sklearn: "Scikit-learn (Fast ML)",
        legacy: "Legacy Model",
        fallback: "Fallback Mode",
      };

      modelBadge.innerHTML = `${modelIcons[modelType] || "🤖"} ${
        modelNames[modelType] || modelType
      }`;
      modelBadge.style.display = "block";
    }

    // Update model description
    if (modelDescription) {
      const descriptions = {
        pytorch:
          "Analyzed using DistilBERT transformer model (85-95% accuracy)",
        sklearn:
          "Analyzed using TF-IDF + Logistic Regression (75-85% accuracy)",
        legacy: "Analyzed using legacy embedding-based model",
        fallback: "Using fallback prediction due to model unavailability",
      };
      modelDescription.textContent =
        descriptions[modelType] || "Based on AI analysis of your symptoms";
    }

    // Show alternatives if available
    const entitiesSection = document.getElementById("entitiesSection");
    if (data.alternatives && data.alternatives.length > 0) {
      entitiesSection.innerHTML = `
        <h4 style="color: var(--secondary-blue); margin-bottom: 1rem">
          Alternative Specialists
        </h4>
        <div style="display: grid; gap: 1rem;">
          ${data.alternatives
            .slice(0, 3)
            .map(
              (alt) => `
              <div style="display: flex; justify-content: space-between; align-items: center; 
                          padding: 1rem; background: white; border-radius: 8px; border: 1px solid var(--secondary-gray);">
                <div style="display: flex; align-items: center; gap: 1rem;">
                  <span style="font-size: 2rem;">${getSpecialistIcon(
                    alt.specialist || alt.name
                  )}</span>
                  <span style="font-weight: 500; color: var(--text-primary);">${escapeHtml(
                    alt.specialist || alt.name
                  )}</span>
                </div>
                <span style="color: var(--secondary-blue); font-weight: 600;">
                  ${Math.round((alt.confidence || alt.score || 0) * 100)}%
                </span>
              </div>
            `
            )
            .join("")}
        </div>
      `;
    } else {
      // Keep original entities section if no alternatives
      entitiesSection.innerHTML = `
        <h4 style="color: var(--secondary-blue); margin-bottom: 1rem">
          Extracted Medical Entities
        </h4>
        <div id="entitiesList" style="display: flex; flex-wrap: wrap; gap: 0.5rem">
          <span style="padding: 0.5rem 1rem; background: white; border-radius: 20px; font-size: 0.9rem; border: 1px solid var(--secondary-gray);">
            No additional entities extracted
          </span>
        </div>
      `;
    }

    resultsSection.classList.remove("hidden");

    // Smooth scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  } else {
    showSymptomAlert(
      "No specialist recommendation available. Please try rephrasing your symptoms."
    );
  }
}

// Generate medical summary
document
  .getElementById("summaryForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = document.getElementById("summaryInput").value.trim();

    if (!text) {
      showSummaryAlert("Please enter medical text to summarize");
      return;
    }

    setSummaryLoading(true);
    document.getElementById("summaryAlert").classList.add("hidden");
    document.getElementById("summaryOutput").innerHTML = "";

    try {
      const response = await fetch(`${API_BASE_URL}/ai/summary/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: text }),
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await response.json();

      if (response.ok) {
        displaySummaryResults(data);
      } else {
        showSummaryAlert(
          data.detail ||
            data.error ||
            "Summary generation failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Summary error:", error);
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        showSummaryAlert(
          "Cannot connect to server. Please ensure the backend is running and CORS is configured."
        );
      } else {
        showSummaryAlert("Network error. Please try again.");
      }
    } finally {
      setSummaryLoading(false);
    }
  });

// Display summary results
function displaySummaryResults(data) {
  const outputDiv = document.getElementById("summaryOutput");

  let content = "";

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
                    ${data.key_points
                      .map(
                        (point) => `
                        <li>${escapeHtml(point)}</li>
                    `
                      )
                      .join("")}
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
                    ${Object.entries(data.entities)
                      .map(
                        ([type, items]) => `
                        <div>
                            <strong style="color: var(--primary-blue); text-transform: capitalize;">
                                ${escapeHtml(type)}:
                            </strong>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                                ${items
                                  .map(
                                    (item) => `
                                    <span class="entity-tag">${escapeHtml(
                                      item
                                    )}</span>
                                `
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `
                      )
                      .join("")}
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
                    ${data.conditions
                      .map(
                        (condition) => `
                        <span class="condition-tag">${escapeHtml(
                          condition
                        )}</span>
                    `
                      )
                      .join("")}
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
                    ${data.medications
                      .map(
                        (med) => `
                        <span class="medication-tag">${escapeHtml(med)}</span>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  if (content) {
    outputDiv.innerHTML = content;
    // Smooth scroll to output
    setTimeout(() => {
      outputDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  } else {
    showSummaryAlert(
      "No summary content available. Please try with different text."
    );
  }
}

// Alert functions
function showSymptomAlert(message, type = "error") {
  const alertDiv = document.getElementById("symptomAlert");
  const alertText = document.getElementById("symptomAlertText");

  alertDiv.className = `alert alert-${type}`;
  alertText.textContent = message;
  alertDiv.classList.remove("hidden");
}

function showSummaryAlert(message, type = "error") {
  const alertDiv = document.getElementById("summaryAlert");
  const alertText = document.getElementById("summaryAlertText");

  alertDiv.className = `alert alert-${type}`;
  alertText.textContent = message;
  alertDiv.classList.remove("hidden");
}

// Loading states
function setSymptomLoading(isLoading) {
  const btn = document.getElementById("analyzeBtn");
  const spinner = document.getElementById("analyzeSpinner");
  const text = document.getElementById("analyzeBtnText");

  btn.disabled = isLoading;
  if (isLoading) {
    spinner.classList.remove("hidden");
    text.classList.add("hidden");
  } else {
    spinner.classList.add("hidden");
    text.classList.remove("hidden");
  }
}

function setSummaryLoading(isLoading) {
  const btn = document.getElementById("generateBtn");
  const spinner = document.getElementById("generateSpinner");
  const text = document.getElementById("generateBtnText");

  btn.disabled = isLoading;
  if (isLoading) {
    spinner.classList.remove("hidden");
    text.classList.add("hidden");
  } else {
    spinner.classList.add("hidden");
    text.classList.remove("hidden");
  }
}

// Utility functions
function getSpecialistIcon(specialist) {
  const icons = {
    cardiologist: "❤️",
    cardiology: "❤️",
    dermatologist: "🧴",
    dermatology: "🧴",
    neurologist: "🧠",
    neurology: "🧠",
    orthopedist: "🦴",
    orthopedics: "🦴",
    pediatrician: "👶",
    pediatrics: "👶",
    psychiatrist: "🧘",
    psychiatry: "🧘",
    ophthalmologist: "👁️",
    ophthalmology: "👁️",
    ent: "👂",
    gastroenterologist: "🫁",
    gastroenterology: "🫁",
    general: "🩺",
    "general medicine": "🩺",
  };

  const key = specialist.toLowerCase();
  for (const [specialty, icon] of Object.entries(icons)) {
    if (key.includes(specialty)) {
      return icon;
    }
  }
  return "👨‍⚕️";
}

function getConfidenceMessage(confidence) {
  if (confidence >= 0.9) return "Very high confidence in this recommendation";
  if (confidence >= 0.75)
    return "High confidence - good match for your symptoms";
  if (confidence >= 0.6)
    return "Moderate confidence - consider alternatives too";
  return "Lower confidence - please consult with a general practitioner";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Clear results and reset form
function clearResults() {
  document.getElementById("resultsSection").classList.add("hidden");
  document.getElementById("symptoms").value = "";
  document.getElementById("symptoms").focus();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (checkAuth()) {
    loadUserInfo();

    // Initialize examples section
    initializeExamplesSection();

    // Close button handler
    $("#closeExamplesBtn").on("click", function () {
      localStorage.setItem("aiInsightsExamplesClosed", "true");
      $("#exampleSymptomsWrapper").fadeOut();
    });

    // Rotate chevron on collapse
    $("#exampleSymptomsCollapse").on("show.bs.collapse", function () {
      $("#toggleExamplesChevron").css("transform", "rotate(180deg)");
    });

    $("#exampleSymptomsCollapse").on("hide.bs.collapse", function () {
      $("#toggleExamplesChevron").css("transform", "rotate(0deg)");
    });

    // Example button click handlers
    $(".example-btn").on("click", function () {
      const exampleKey = $(this).data("example");
      fillSimpleExample(exampleKey);

      // Close the collapse after selection
      $("#exampleSymptomsCollapse").collapse("hide");
    });
  }
});

// Generate Summary Function
async function generateSummary() {
  const btn = document.getElementById("summaryBtn");
  const spinner = document.getElementById("summarySpinner");
  const text = document.getElementById("summaryBtnText");
  const alertDiv = document.getElementById("summaryAlert");
  const alertText = document.getElementById("summaryAlertText");
  const summarySection = document.getElementById("summarySection");

  // Hide previous results and errors
  alertDiv.classList.add("hidden");
  summarySection.classList.add("hidden");

  // Show loading state
  btn.disabled = true;
  spinner.classList.remove("hidden");
  text.classList.add("hidden");

  try {
    const response = await fetch(`${API_BASE_URL}/ai/patient-summary/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        patient_id: 1, // This should be the logged-in user's patient ID
      }),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();

    if (response.ok) {
      displaySummaryResults(data);
    } else {
      alertText.textContent =
        data.detail || data.error || "Failed to generate summary";
      alertDiv.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Summary generation error:", error);
    alertText.textContent =
      "Network error. Please ensure the backend is running.";
    alertDiv.classList.remove("hidden");
  } finally {
    // Reset button state
    btn.disabled = false;
    spinner.classList.add("hidden");
    text.classList.remove("hidden");
  }
}

// Display summary results
function displaySummaryResults(data) {
  const summarySection = document.getElementById("summarySection");
  const summaryContent = document.getElementById("summaryContent");

  if (data.bullets && data.bullets.length > 0) {
    const bulletsHtml = data.bullets
      .map(
        (bullet) =>
          `<li style="margin-bottom: 0.5rem;">${escapeHtml(bullet)}</li>`
      )
      .join("");

    summaryContent.innerHTML = `
      <h4 style="color: var(--secondary-blue); margin-bottom: 1rem;">Key Medical Points:</h4>
      <ul style="padding-left: 1.5rem; color: var(--text-primary);">
        ${bulletsHtml}
      </ul>
      ${
        data.citations && data.citations.length > 0
          ? `<p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
               Based on ${data.citations.length} medical record(s)
             </p>`
          : ""
      }
    `;
  } else {
    summaryContent.innerHTML = `
      <p style="color: var(--text-secondary);">
        No medical records available yet. Once you have lab results, prescriptions, 
        or encounter notes, the AI will generate a comprehensive summary.
      </p>
    `;
  }

  summarySection.classList.remove("hidden");
}
