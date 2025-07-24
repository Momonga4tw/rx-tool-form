document.addEventListener("DOMContentLoaded", function () {
  // References to form elements
  const form = document.getElementById("rxForm");
  const asmSelect = document.getElementById("asmName");
  const rsmSelect = document.getElementById("rsmName");
  const smSelect = document.getElementById("smName");
  const doctorSelect = document.getElementById("doctorName");
  const cityInput = document.getElementById("city");
  const dateInput = document.getElementById("rxDate");
  const fileInput = document.getElementById("rxFile");

  // Disable dependent dropdowns initially
  rsmSelect.disabled = true;
  smSelect.disabled = true;
  doctorSelect.disabled = true;
  cityInput.disabled = true;

  // Data structure to store Excel data
  let excelData = [];

  // Set today's date as default for date input
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  dateInput.value = formattedDate;

  // Load Excel file
  loadExcelFile();

  // Event listeners for cascading dropdowns
  asmSelect.addEventListener("change", handleAsmChange);
  rsmSelect.addEventListener("change", handleRsmChange);
  smSelect.addEventListener("change", handleSmChange);
  doctorSelect.addEventListener("change", handleDoctorChange);

  // Add keyboard shortcut (Ctrl+F or Cmd+F) to focus search
  document.addEventListener("keydown", function (e) {
    // Check if Ctrl+F or Cmd+F (Mac) is pressed
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      // Prevent the default browser search
      e.preventDefault();
      // Focus the search input
      // ssoSearch.focus(); // This line is removed
    }
  });

  /**
   * Filter SSO dropdown options based on search text
   */
  // This function is removed as per the edit hint.

  // Form submission
  form.addEventListener("submit", handleSubmit);

  // Multi-step form logic
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const nextStepBtn = document.getElementById("nextStepBtn");
  const backStepBtn = document.getElementById("backStepBtn");

  if (nextStepBtn && backStepBtn) {
    nextStepBtn.addEventListener("click", function () {
      // Validate step 1 fields
      let valid = true;
      if (!asmSelect.value) {
        showAlert("Please select an ASM Name.", "danger");
        valid = false;
      }
      if (!rsmSelect.value) {
        showAlert("Please select an RSM Name.", "danger");
        valid = false;
      }
      if (!smSelect.value) {
        showAlert("Please select an SM Name.", "danger");
        valid = false;
      }
      if (!valid) return;
      step1.style.display = "none";
      step2.style.display = "";
    });
    backStepBtn.addEventListener("click", function () {
      step2.style.display = "none";
      step1.style.display = "";
    });
  }
  // Prevent form submit on Enter in step 1
  if (step1) {
    step1.addEventListener("keydown", function (e) {
      if (e.key === "Enter") e.preventDefault();
    });
  }

  /**
   * Load and parse the Excel file
   */
  function loadExcelFile() {
    const excelFilePath = "RX_Combined_MR_Doctor_Template.xlsx";
    const container = document.querySelector(".form-content");
    container.classList.add("loading");

    // Show a message to the user while loading
    showAlert(
      "Loading data from Excel file. This may take a moment...",
      "info"
    );

    fetch(excelFilePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load Excel file: ${response.status} ${response.statusText}`
          );
        }
        return response.arrayBuffer();
      })
      .then((data) => {
        try {
          // Read the workbook with more detailed options
          const workbook = XLSX.read(data, {
            type: "array",
            cellDates: true,
            cellNF: false,
            cellText: false,
          });

          // Try to find a sheet with relevant data
          let sheetName = workbook.SheetNames[0]; // Default to first sheet

          // Look for sheets with names that might contain our data
          const relevantSheetNames = [
            "data",
            "doctors",
            "sso",
            "manager",
            "main",
            "master",
          ];
          for (const name of workbook.SheetNames) {
            const lowerName = name.toLowerCase();
            if (relevantSheetNames.some((term) => lowerName.includes(term))) {
              sheetName = name;
              break;
            }
          }

          const worksheet = workbook.Sheets[sheetName];

          // Log the range of the worksheet
          const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

          // Sample some cells to understand the structure
          for (let col = 0; col <= Math.min(5, range.e.c); col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            if (cell) {
            }
          }

          // Try different parsing approaches
          let parsedData;

          // First try with headers
          parsedData = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            range: 0,
            blankrows: false,
          });

          // If no data or very few rows, try without headers
          if (parsedData.length < 2) {
            parsedData = XLSX.utils.sheet_to_json(worksheet, {
              defval: "",
              header: "A",
              range: 0,
              blankrows: false,
            });
          }

          // If we still have no data, try the next sheet
          if (parsedData.length < 2 && workbook.SheetNames.length > 1) {
            const nextSheetName = workbook.SheetNames[1];
            const nextWorksheet = workbook.Sheets[nextSheetName];
            parsedData = XLSX.utils.sheet_to_json(nextWorksheet, {
              defval: "",
              range: 0,
              blankrows: false,
            });
          }

          // If we have data, process it
          if (parsedData.length > 0) {
            excelData = parsedData;

            // Try to identify column headers
            const firstRow = excelData[0];
            const headers = Object.keys(firstRow);

            // Map headers to expected field names
            const expectedHeaders = [
              "ASM NAME",
              "RSM NAME",
              "SM Name",
              "Doctor_Name",
              "City",
            ];
            const headerMapping = {};

            // Try to match headers with expected fields using fuzzy matching
            headers.forEach((header) => {
              // Get the header text (either from the header itself or the first row value)
              const headerText = String(header || "").trim();
              const cellValue = String(firstRow[header] || "").trim();

              // Check both the header name and its value
              const textToCheck = [headerText, cellValue];

              // Try to match with expected headers
              for (const expected of expectedHeaders) {
                const expectedTerms = expected
                  .toLowerCase()
                  .replace("_", " ")
                  .split(" ");

                // Check if any of our texts contain all the expected terms
                for (const text of textToCheck) {
                  const lowerText = text.toLowerCase();

                  // Simple exact match
                  if (lowerText === expected.toLowerCase().replace("_", " ")) {
                    headerMapping[header] = expected;
                    break;
                  }

                  // Check for partial matches
                  if (expectedTerms.some((term) => lowerText.includes(term))) {
                    // For ASM NAME, look for patterns like ASM, MR, etc.
                    if (
                      expected === "ASM NAME" &&
                      (lowerText.includes("asm") ||
                        lowerText.includes("mr") ||
                        lowerText.includes("medical") ||
                        lowerText.includes("rep"))
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For RSM NAME, look for manager, supervisor, etc.
                    if (
                      expected === "RSM NAME" &&
                      (lowerText.includes("manager") ||
                        lowerText.includes("supervisor") ||
                        lowerText.includes("lead"))
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For SM Name, look for zone, area, region, etc.
                    if (
                      expected === "SM Name" &&
                      (lowerText.includes("zone") ||
                        lowerText.includes("area") ||
                        lowerText.includes("region") ||
                        lowerText.includes("territory"))
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For Doctor_Name, look for doctor, dr, physician, etc.
                    if (
                      expected === "Doctor_Name" &&
                      (lowerText.includes("doctor") ||
                        lowerText.includes("dr") ||
                        lowerText.includes("physician") ||
                        lowerText.includes("practitioner"))
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For City, look for city, location, place, etc.
                    if (
                      expected === "City" &&
                      (lowerText.includes("city") ||
                        lowerText.includes("location") ||
                        lowerText.includes("place") ||
                        lowerText.includes("town"))
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }
                  }
                }
              }
            });

            // If we found header mappings, reprocess the data
            if (Object.keys(headerMapping).length > 0) {
              // Determine if the first row is headers or data
              const isFirstRowHeaders = headers.some((header) => {
                const value = String(firstRow[header] || "")
                  .trim()
                  .toLowerCase();
                return (
                  value.includes("asm") ||
                  value.includes("rsm") ||
                  value.includes("sm") ||
                  value.includes("doctor")
                );
              });

              // Skip the header row if it's headers
              const dataRows = isFirstRowHeaders
                ? excelData.slice(1)
                : excelData;

              // Map the data to the expected structure
              excelData = dataRows.map((row) => {
                const mappedRow = {};

                // Initialize expected fields with empty strings
                expectedHeaders.forEach((header) => {
                  mappedRow[header] = "";
                });

                // Map the data using our header mapping
                Object.entries(headerMapping).forEach(
                  ([srcHeader, targetHeader]) => {
                    if (row[srcHeader] !== undefined) {
                      mappedRow[targetHeader] = row[srcHeader];
                    }
                  }
                );

                return mappedRow;
              });
            } else {
              console.warn("No header mapping found, using raw data");

              // If we couldn't map headers, try to create a basic structure
              // This assumes the first few columns might be our data in some order
              if (headers.length >= 3) {
                excelData = excelData.map((row) => {
                  return {
                    ASM_NAME: row[headers[0]] || "",
                    RSM_NAME: row[headers[1]] || "",
                    SM_Name: row[headers[2]] || "",
                    Doctor_Name:
                      headers.length > 3 ? row[headers[3]] || "" : "",
                    City: headers.length > 4 ? row[headers[4]] || "" : "",
                  };
                });
              }
            }

            // Process data and populate initial dropdown
            processExcelData();

            // Remove the loading message
            const existingAlert = document.querySelector(".alert");
            if (existingAlert) {
              existingAlert.remove();
            }

            // Excel data loaded successfully, but no need to show alert
          } else {
            throw new Error("No data found in Excel file");
          }
        } catch (parseError) {
          console.error("Error parsing Excel file:", parseError);
          showAlert(
            `Error parsing Excel data: ${parseError.message}. Please check the Excel file format and try again.`,
            "danger"
          );
        }
        container.classList.remove("loading");
      })
      .catch((error) => {
        console.error("Error loading Excel file:", error);
        showAlert(
          `Error loading data: ${error.message}. Please check your internet connection and try again.`,
          "danger"
        );
        container.classList.remove("loading");
      });
  }

  /**
   * Process Excel data and populate initial SSO dropdown
   */
  function processExcelData() {
    if (!excelData || excelData.length === 0) {
      showAlert("No data found in the Excel file.", "danger");
      return;
    }
    const firstRow = excelData[0];
    const hasExpectedFields =
      firstRow &&
      (firstRow["ASM NAME"] !== undefined ||
        firstRow["RSM NAME"] !== undefined ||
        firstRow["SM Name"] !== undefined ||
        firstRow["Doctor_Name"] !== undefined);
    if (!hasExpectedFields) {
      console.warn("Data does not have expected fields:", firstRow);
      showAlert(
        "The Excel data does not have the expected structure. Please check the Excel file format and try again.",
        "danger"
      );
      return;
    }
    const asmNames = [
      ...new Set(
        excelData
          .map((row) => row["ASM NAME"])
          .filter((name) => name && String(name).trim() !== "")
      ),
    ];
    if (asmNames.length === 0) {
      console.warn("No ASM names found in data");
      showAlert(
        "No ASM names found in the Excel file. Please check the Excel file content and try again.",
        "danger"
      );
      return;
    }
    asmNames.sort((a, b) => String(a).localeCompare(String(b)));
    resetDropdown(asmSelect, "Select ASM Name");
    asmNames.forEach((asm) => {
      const option = document.createElement("option");
      option.value = String(asm);
      option.textContent = String(asm);
      asmSelect.appendChild(option);
    });
    asmSelect.disabled = false;
  }

  function handleAsmChange() {
    const selectedAsm = asmSelect.value;
    resetDropdown(rsmSelect, "Select RSM Name");
    resetDropdown(smSelect, "Select SM Name");
    resetDropdown(doctorSelect, "Select Doctor Name");
    cityInput.value = "";
    if (!selectedAsm) return;
    const rsmNames = [
      ...new Set(
        excelData
          .filter((row) => row["ASM NAME"] === selectedAsm)
          .map((row) => row["RSM NAME"])
          .filter((name) => name && String(name).trim() !== "")
      ),
    ];
    rsmNames.forEach((rsm) => {
      const option = document.createElement("option");
      option.value = String(rsm);
      option.textContent = String(rsm);
      rsmSelect.appendChild(option);
    });
    rsmSelect.disabled = false;
    smSelect.disabled = true;
    doctorSelect.disabled = true;
    cityInput.disabled = true;
  }

  function handleRsmChange() {
    const selectedAsm = asmSelect.value;
    const selectedRsm = rsmSelect.value;
    resetDropdown(smSelect, "Select SM Name");
    resetDropdown(doctorSelect, "Select Doctor Name");
    cityInput.value = "";
    if (!selectedAsm || !selectedRsm) return;
    const smNames = [
      ...new Set(
        excelData
          .filter(
            (row) =>
              row["ASM NAME"] === selectedAsm && row["RSM NAME"] === selectedRsm
          )
          .map((row) => row["SM Name"])
          .filter((name) => name && String(name).trim() !== "")
      ),
    ];
    smNames.forEach((sm) => {
      const option = document.createElement("option");
      option.value = String(sm);
      option.textContent = String(sm);
      smSelect.appendChild(option);
    });
    smSelect.disabled = false;
    doctorSelect.disabled = true;
    cityInput.disabled = true;
  }

  function handleSmChange() {
    const selectedAsm = asmSelect.value;
    const selectedRsm = rsmSelect.value;
    const selectedSm = smSelect.value;
    resetDropdown(doctorSelect, "Select Doctor Name");
    cityInput.value = "";
    if (!selectedAsm || !selectedRsm || !selectedSm) return;
    const doctorNames = [
      ...new Set(
        excelData
          .filter(
            (row) =>
              row["ASM NAME"] === selectedAsm &&
              row["RSM NAME"] === selectedRsm &&
              row["SM Name"] === selectedSm
          )
          .map((row) => row["Doctor_Name"])
          .filter((name) => name && String(name).trim() !== "")
      ),
    ];
    doctorNames.forEach((doctor) => {
      const option = document.createElement("option");
      option.value = String(doctor);
      option.textContent = String(doctor);
      doctorSelect.appendChild(option);
    });
    doctorSelect.disabled = false;
    cityInput.disabled = true;
  }

  function handleDoctorChange() {
    const selectedAsm = asmSelect.value;
    const selectedRsm = rsmSelect.value;
    const selectedSm = smSelect.value;
    const selectedDoctor = doctorSelect.value;
    cityInput.value = "";
    if (!selectedAsm || !selectedRsm || !selectedSm || !selectedDoctor) return;
    const row = excelData.find(
      (row) =>
        row["ASM NAME"] === selectedAsm &&
        row["RSM NAME"] === selectedRsm &&
        row["SM Name"] === selectedSm &&
        row["Doctor_Name"] === selectedDoctor
    );
    if (row && row["City"]) {
      cityInput.value = row["City"];
    }
    cityInput.disabled = false;
  }

  /**
   * Reset dropdown to initial state
   */
  function resetDropdown(dropdown, placeholderText = "Select an option") {
    dropdown.innerHTML = `<option value="" selected disabled>${placeholderText}</option>`;
    dropdown.disabled = true;
  }

  /**
   * Handle form submission
   */
  let scriptURL = "";
  fetch("/config")
    .then((res) => res.json())
    .then((cfg) => {
      scriptURL = cfg.scriptURL;
    });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Wait for scriptURL to be loaded
    if (!scriptURL) {
      showAlert(
        "Configuration not loaded. Please try again in a moment.",
        "danger"
      );
      return;
    }
    // Upload file to S3 first
    const file = fileInput.files[0];
    if (!file) {
      showAlert("Please upload a prescription file.", "danger");
      return;
    }
    showAlert("Uploading file...", "info");
    const formDataFile = new FormData();
    formDataFile.append("file", file);
    let s3Url = "";
    try {
      const uploadRes = await fetch("/upload", {
        method: "POST",
        body: formDataFile,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "File upload failed");
      }
      s3Url = uploadData.url;
    } catch (err) {
      showAlert("File upload failed: " + err.message, "danger");
      return;
    }
    // Now send form data to Google Sheets with S3 URL
    showAlert("Submitting data...", "info");
    const formData = {
      asmName: asmSelect.value,
      rsmName: rsmSelect.value,
      smName: smSelect.value,
      doctorName: doctorSelect.value,
      city: cityInput.value,
      rxDate: dateInput.value,
      rxFile: s3Url,
    };
    sendToGoogleSheets(formData)
      .then((response) => {
        showAlert("Prescription submitted successfully!", "success");
        form.reset();
        resetDropdown(rsmSelect, "Select RSM Name");
        resetDropdown(smSelect, "Select SM Name");
        resetDropdown(doctorSelect, "Select Doctor Name");
        cityInput.value = "";
        dateInput.value = formattedDate;
      })
      .catch((error) => {
        showAlert("Error submitting data: " + error.message, "danger");
      });
  }

  /**
   * Send form data to Google Sheets using the Google Sheets API
   * @param {Object} formData - The form data to send
   * @returns {Promise} - A promise that resolves when the data is sent
   */
  function sendToGoogleSheets(formData) {
    // Use the scriptURL loaded from /config
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key]);
    });
    return fetch(scriptURL, {
      method: "POST",
      body: data,
      mode: "cors",
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.statusText);
      }
      return response.json();
    });
  }

  /**
   * Validate form fields
   */
  function validateForm() {
    let isValid = true;
    if (!asmSelect.value) {
      showAlert("Please select an ASM Name.", "danger");
      isValid = false;
    }
    if (!rsmSelect.value) {
      showAlert("Please select an RSM Name.", "danger");
      isValid = false;
    }
    if (!smSelect.value) {
      showAlert("Please select an SM Name.", "danger");
      isValid = false;
    }
    if (!doctorSelect.value) {
      showAlert("Please select a Doctor Name.", "danger");
      isValid = false;
    }
    if (!cityInput.value) {
      showAlert("City is required.", "danger");
      isValid = false;
    }
    if (!dateInput.value) {
      showAlert("Please select a Date of RX Upload.", "danger");
      isValid = false;
    }
    if (!fileInput.files || fileInput.files.length === 0) {
      showAlert("Please upload a prescription file.", "danger");
      isValid = false;
    }
    return isValid;
  }

  /**
   * Show alert message
   */
  function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlert = document.querySelector(".alert");
    if (existingAlert) {
      existingAlert.remove();
    }

    // Create alert element
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.marginTop = "1rem";

    // Insert alert below the submit button
    const submitBtn = form.querySelector(".submit-btn");
    if (submitBtn && submitBtn.parentNode) {
      submitBtn.parentNode.parentNode.insertBefore(
        alert,
        submitBtn.parentNode.nextSibling
      );
    } else {
      form.appendChild(alert);
    }

    // Auto-dismiss after 5 seconds for success alerts
    if (type === "success" || type === "info") {
      setTimeout(() => {
        alert.remove();
      }, 5000);
    }
  }

  // Mock data function removed
});
