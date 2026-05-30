let selectedContractType = 'general';
let currentTab = 'single';

document.addEventListener('DOMContentLoaded', function() {
    initContractTypes();
    initUploadArea();
    initTabs();
    initFeedbackButtons();
});

function initContractTypes() {
    const typeCards = document.querySelectorAll('.type-card');
    typeCards.forEach(card => {
        card.addEventListener('click', function() {
            typeCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            selectedContractType = this.dataset.type;
        });
    });
}

function initUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadForm = document.getElementById('upload-form');

    if (!uploadArea) return;

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            uploadFile();
        }
    });

    fileInput.addEventListener('change', uploadFile);

    const batchUploadArea = document.getElementById('batch-upload-area');
    const batchFileInput = document.getElementById('batch-file-input');

    if (batchUploadArea) {
        batchUploadArea.addEventListener('click', () => batchFileInput.click());

        batchUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            batchUploadArea.classList.add('dragover');
        });

        batchUploadArea.addEventListener('dragleave', () => {
            batchUploadArea.classList.remove('dragover');
        });

        batchUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            batchUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                batchFileInput.files = e.dataTransfer.files;
                uploadBatchFile();
            }
        });

        batchFileInput.addEventListener('change', uploadBatchFile);
    }
}

function uploadFile() {
    const fileInput = document.getElementById('file-input');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    if (fileInput.files.length === 0) return;

    loading.classList.add('show');
    errorDiv.style.display = 'none';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('contract_type', selectedContractType);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        loading.classList.remove('show');
        if (data.error) {
            errorDiv.textContent = data.error;
            errorDiv.style.display = 'block';
        } else {
            window.location.href = data.redirect_url;
        }
    })
    .catch(error => {
        loading.classList.remove('show');
        errorDiv.textContent = '上传失败，请重试';
        errorDiv.style.display = 'block';
    });
}

function uploadBatchFile() {
    const fileInput = document.getElementById('batch-file-input');
    const loading = document.getElementById('batch-loading');
    const errorDiv = document.getElementById('batch-error');

    if (fileInput.files.length === 0) return;

    loading.classList.add('show');
    errorDiv.style.display = 'none';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('contract_type', selectedContractType);

    fetch('/batch_upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        loading.classList.remove('show');
        if (data.error) {
            errorDiv.textContent = data.error;
            errorDiv.style.display = 'block';
        } else {
            window.location.href = data.redirect_url;
        }
    })
    .catch(error => {
        loading.classList.remove('show');
        errorDiv.textContent = '上传失败，请重试';
        errorDiv.style.display = 'block';
    });
}

function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        }
    });

    currentTab = tabName;
}

function initFeedbackButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('feedback-btn')) {
            const ruleId = e.target.dataset.ruleId;
            const feedbackType = e.target.dataset.feedback;
            const container = e.target.closest('.feedback-buttons');

            container.querySelectorAll('.feedback-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            sendFeedback(ruleId, feedbackType);
        }
    });
}

function sendFeedback(ruleId, feedback) {
    const formData = new FormData();
    formData.append('rule_id', ruleId);
    formData.append('feedback', feedback);

    fetch('/feedback', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('反馈已记录');
        }
    });
}

function loadTemplate(contractType) {
    fetch(`/templates/${contractType}`)
    .then(response => response.json())
    .then(data => {
        const preview = document.getElementById('template-preview');
        if (preview && data.template) {
            preview.textContent = data.template;
        }
    });
}

function toggleBatchDetails(element) {
    const details = element.querySelector('.batch-result-details');
    if (details) {
        details.classList.toggle('show');
    }
}

function saveCustomRule() {
    const form = document.getElementById('custom-rule-form');
    const formData = new FormData(form);
    const errorDiv = document.getElementById('custom-rule-error');
    const successDiv = document.getElementById('custom-rule-success');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    fetch('/save_custom_rule', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            errorDiv.textContent = data.error;
            errorDiv.style.display = 'block';
        } else {
            successDiv.textContent = '规则保存成功！';
            successDiv.style.display = 'block';
            form.reset();
            loadRulesList();
        }
    })
    .catch(error => {
        errorDiv.textContent = '保存失败，请重试';
        errorDiv.style.display = 'block';
    });
}

function loadRulesList() {
    fetch('/get_rules')
    .then(response => response.json())
    .then(data => {
        const tableBody = document.querySelector('#rules-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        data.rules.forEach(rule => {
            const severityClass = `risk-${rule.severity}`;
            const severityText = rule.severity === 'high' ? '高' : rule.severity === 'medium' ? '中' : '低';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rule.id}</td>
                <td>${rule.name}</td>
                <td>${rule.category}</td>
                <td><span class="risk-badge ${severityClass}">${severityText}</span></td>
                <td>
                    <div class="weight-bar">
                        <div class="weight-fill" style="width: ${rule.weight * 50}%"></div>
                    </div>
                    <small>${rule.weight.toFixed(2)}</small>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });
}

function exportReport(sessionId, format) {
    window.open(`/export/${sessionId}/${format}`, '_blank');
}

function exportBatchReport(batchId, format) {
    window.open(`/export_batch/${batchId}/${format}`, '_blank');
}
