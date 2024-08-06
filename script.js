// Script 1: Stratified Sampling Tool
document.getElementById('csvForm').addEventListener('submit', function(event) {
    event.preventDefault();
    let fileInput = document.getElementById('csvFile');
    let file = fileInput.files[0];
    if (!file) {
        alert('Please select a CSV file.');
        return;
    }
    let confidenceLevel = parseFloat(document.getElementById('confidenceLevel').value) / 100;
    let marginOfError = parseFloat(document.getElementById('marginOfError').value) / 100;
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event) {
        try {
            let csv = event.target.result;
            let lines = csv.split('\n').map(line => line.trim());
            let headers = lines[0].split(',').map(header => header.trim());
            let data = lines.slice(1).map(line => line.split(',').map(field => field.trim()));
    
            let stratifyColumnIndex = headers.findIndex(header => header.toLowerCase() === 'correct');
            if (stratifyColumnIndex === -1) {
                alert('Column "correct" not found in the CSV file.');
                return;
            }
    
            data = data.filter(row => row.length === headers.length); // Ensure each row has the correct number of fields
    
            data.forEach(row => {
                let value = parseFloat(row[stratifyColumnIndex]);
                if (!isNaN(value)) {
                    row[stratifyColumnIndex] = value;
                } else {
                    console.warn('Invalid value in "correct" column:', row[stratifyColumnIndex]);
                }
            });
    
            let numBins = 5;
            let values = data.map(row => row[stratifyColumnIndex]).filter(val => !isNaN(val));
            let min = Math.min(...values);
            let max = Math.max(...values);
            let binWidth = (max - min) / numBins;
            let bins = [];
            for (let i = 0; i < numBins; i++) {
                bins.push({ range: [min + i * binWidth, min + (i + 1) * binWidth], rows: [] });
            }
            data.forEach(row => {
                let value = row[stratifyColumnIndex];
                if (!isNaN(value)) {
                    let binIndex = Math.floor((value - min) / binWidth);
                    binIndex = Math.min(binIndex, numBins - 1);
                    bins[binIndex].rows.push(row);
                }
            });
    
            let populationSize = data.length;
            let sampleSize = calculateSampleSize(populationSize, confidenceLevel, marginOfError);
            let sampledData = stratifiedSample(data, stratifyColumnIndex, sampleSize);
    
            displayResults(sampledData, headers);
        } catch (error) {
            console.error('Error processing CSV:', error);
            alert('An error occurred while processing the CSV. Please check the console for details.');
        }
    };
});

function calculateSampleSize(populationSize, confidenceLevel, marginOfError) {
    let zScore = normInv(1 - (1 - confidenceLevel) / 2);
    let p = 0.5;
    let numerator = (zScore ** 2) * p * (1 - p);
    let denominator = marginOfError ** 2;
    let sampleSize = (numerator / denominator) / (1 + ((numerator / denominator) - 1) / populationSize);
    return Math.ceil(sampleSize);
}

function normInv(p) {
    let a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
    let a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
    let b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
    let b4 = 66.8013118877197, b5 = -13.2806815528857;
    let c1 = -7.78489400243029E-03, c2 = -0.322396458041136;
    let c3 = -2.40075827716184, c4 = -2.54973253934373;
    let c5 = 4.37466414146497, c6 = 2.93816398269878;
    let d1 = 7.78469570904146E-03, d2 = 0.32246712907004;
    let d3 = 2.445134137143, d4 = 3.75440866190742;
    let pLow = 0.02425, pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
               ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= pHigh) {
        q = p - 0.5;
        r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
               (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
}

function stratifiedSample(data, stratifyColumnIndex, sampleSize) {
    let numBins = 5;
    let values = data.map(row => row[stratifyColumnIndex]).filter(val => !isNaN(val));
    let min = Math.min(...values);
    let max = Math.max(...values);
    let binWidth = (max - min) / numBins;
    //let numBins = 5;
    //let min = Math.min(...data.map(row => row[stratifyColumnIndex]));
    //let max = Math.max(...data.map(row => row[stratifyColumnIndex]));
    //let binWidth = (max - min) / numBins;
    let bins = [];
    for (let i = 0; i < numBins; i++) {
        bins.push({ range: [min + i * binWidth, min + (i + 1) * binWidth], rows: [] });
    }
    data.forEach(row => {
        let value = row[stratifyColumnIndex];
        let binIndex = Math.floor((value - min) / binWidth);
        binIndex = Math.min(binIndex, numBins - 1);
        bins[binIndex].rows.push(row);
    });
    let totalSize = data.length;
    let strataSizes = bins.map(bin => bin.rows.length);
    let stratumSampleSizes = strataSizes.map(size => Math.round(size / totalSize * sampleSize));
    let sampledData = [];
    bins.forEach((bin, index) => {
        let stratumSampleSize = stratumSampleSizes[index];
        let stratumData = bin.rows;
        if (stratumSampleSize >= stratumData.length) {
            sampledData.push(...stratumData);
        } else {
            let sampledIndices = [];
            while (sampledIndices.length < stratumSampleSize) {
                let randomIndex = Math.floor(Math.random() * stratumData.length);
                if (!sampledIndices.includes(randomIndex)) {
                    sampledIndices.push(randomIndex);
                }
            }
            sampledIndices.forEach(i => sampledData.push(stratumData[i]));
        }
    });
    return sampledData;
}

function displayResults(sampledData, headers) {
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h2>Sampled Data:</h2>';
    let table = '<table><thead><tr>';
    table += `<th>${headers[1]}</th>`; // District
    table += `<th>${headers[2]}</th>`; // ROLLNO
    table += `<th>${headers[3]}</th>`; // Candidate_Name
    table += '</tr></thead><tbody>';
    sampledData.forEach(row => {
        table += '<tr>';
        table += `<td>${row[1]}</td>`; // District
        table += `<td>${row[2]}</td>`; // ROLLNO
        table += `<td>${row[3]}</td>`; // Candidate_Name
        table += '</tr>';
    });
    table += '</tbody></table>';
    resultsDiv.innerHTML += table;

    let downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download Sampled CSV';
    downloadButton.addEventListener('click', function() {
        let csvContent = "data:text/csv;charset=utf-8,"
            + `${headers[1]},${headers[2]},${headers[3]}\n`
            + sampledData.map(row => `${row[1]},${row[2]},${row[3]}`).join('\n');
        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sampled_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // After download, show Part 2
        document.getElementById('part2').style.display = 'block';
    });
    resultsDiv.appendChild(downloadButton);
}

// Script 2: Topic and Question Manager
let totalTopics;
let topicsData = [];

function generateTopicForms() {
    totalTopics = parseInt(document.getElementById('numTopics').value, 10);
    const topicsContainer = document.getElementById('topicsContainer');
    topicsContainer.innerHTML = '';
    for (let i = 1; i <= totalTopics; i++) {
        topicsContainer.innerHTML += `
            <div class="topic-container">
                <h3>Topic ${i}</h3>
                <label for="topicName${i}">Topic Name:</label>
                <input type="text" id="topicName${i}" name="topicName${i}" required><br>
                <label for="hard${i}">Number of hard questions:</label>
                <input type="number" id="hard${i}" name="hard${i}" min="0"><br>
                <label for="medium${i}">Number of medium questions:</label>
                <input type="number" id="medium${i}" name="medium${i}" min="0"><br>
                <label for="easy${i}">Number of easy questions:</label>
                <input type="number" id="easy${i}" name="easy${i}" min="0"><br>
            </div>
        `;
    }
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
}

function processForm(event) {
    event.preventDefault();
    const topicsForm = document.getElementById('topicsForm');
    const formData = new FormData(topicsForm);
    topicsData = [];
    for (let i = 1; i <= totalTopics; i++) {
        const topicName = formData.get(`topicName${i}`);
        const hardQuestions = parseInt(formData.get(`hard${i}`)) || 0;
        const mediumQuestions = parseInt(formData.get(`medium${i}`)) || 0;
        const easyQuestions = parseInt(formData.get(`easy${i}`)) || 0;
        topicsData.push({
            topicName,
            hard: hardQuestions,
            medium: mediumQuestions,
            easy: easyQuestions,
            hardNumbers: [],
            mediumNumbers: [],
            easyNumbers: []
        });
    }
    generateQuestionsForms();
}

function generateQuestionsForms() {
    const questionsContainer = document.getElementById('questionsContainer');
    questionsContainer.innerHTML = '';
    topicsData.forEach((topic, index) => {
        const topicNumber = index + 1;
        if (topic.hard > 0) {
            questionsContainer.innerHTML += `
                <div class="question-container">
                    <h3>${topic.topicName} - Hard Questions</h3>
                    ${generateQuestionInputs(topic.hard, `hard${topicNumber}`)}
                </div>
            `;
        }
        if (topic.medium > 0) {
            questionsContainer.innerHTML += `
                <div class="question-container">
                    <h3>${topic.topicName} - Medium Questions</h3>
                    ${generateQuestionInputs(topic.medium, `medium${topicNumber}`)}
                </div>
            `;
        }
        if (topic.easy > 0) {
            questionsContainer.innerHTML += `
                <div class="question-container">
                    <h3>${topic.topicName} - Easy Questions</h3>
                    ${generateQuestionInputs(topic.easy, `easy${topicNumber}`)}
                </div>
            `;
        }
    });
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
}

function generateQuestionInputs(count, name) {
    let inputs = '';
    for (let i = 1; i <= count; i++) {
        inputs += `<label for="${name}${i}">Question ${i}:</label>
                   <input type="number" id="${name}${i}" name="${name}${i}" required><br>`;
    }
    return inputs;
}

function processQuestions(event) {
    event.preventDefault();
    const questionsForm = document.getElementById('questionsForm');
    const formData = new FormData(questionsForm);
    topicsData.forEach((topic, index) => {
        const topicNumber = index + 1;
        for (let i = 1; i <= topic.hard; i++) {
            topic.hardNumbers.push(formData.get(`hard${topicNumber}${i}`));
        }
        for (let i = 1; i <= topic.medium; i++) {
            topic.mediumNumbers.push(formData.get(`medium${topicNumber}${i}`));
        }
        for (let i = 1; i <= topic.easy; i++) {
            topic.easyNumbers.push(formData.get(`easy${topicNumber}${i}`));
        }
    });
    displayCSVPreview();
}

function displayCSVPreview() {
    const previewTable = document.getElementById('csvPreviewTable');
    previewTable.innerHTML = '';
    const header = document.createElement('tr');
    header.innerHTML = '<th>Topic</th><th>Level</th><th>Count</th><th>Questions</th>';
    previewTable.appendChild(header);
    topicsData.forEach(topic => {
        if (topic.hardNumbers.length > 0) {
            appendTopicRow(previewTable, topic.topicName, 'hard', topic.hard, topic.hardNumbers);
        }
        if (topic.mediumNumbers.length > 0) {
            appendTopicRow(previewTable, topic.topicName, 'medium', topic.medium, topic.mediumNumbers);
        }
        if (topic.easyNumbers.length > 0) {
            appendTopicRow(previewTable, topic.topicName, 'easy', topic.easy, topic.easyNumbers);
        }
    });
    document.getElementById('step3').style.display = 'none';
    document.getElementById('previewSection').style.display = 'block';
}

function appendTopicRow(table, topicName, level, count, questions) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${topicName}</td>
        <td>${level}</td>
        <td>${count}</td>
        <td>${questions.join(', ')}</td>
    `;
    table.appendChild(row);
}

function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    let csvRows = [];

    topicsData.forEach(topic => {
        if (topic.hardNumbers.length > 0) {
            csvRows.push(`${topic.topicName},hard,${topic.hard},${topic.hardNumbers.join(',')}`);
        }
        if (topic.mediumNumbers.length > 0) {
            csvRows.push(`${topic.topicName},medium,${topic.medium},${topic.mediumNumbers.join(',')}`);
        }
        if (topic.easyNumbers.length > 0) {
            csvRows.push(`${topic.topicName},easy,${topic.easy},${topic.easyNumbers.join(',')}`);
        }
    });

    csvContent += csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "topics.csv");
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up
    // Optional: You can add a message to inform the user that the download has started
    alert("Your CSV file is being downloaded!");
}