document.addEventListener("DOMContentLoaded", function () {
  // References to form elements
  const form = document.getElementById("rxForm");
  const wsfaSelect = document.getElementById("wsfaCode");
  const wsfaSearch = document.getElementById("wsfaSearch");
  const wsfaSearchMessage = document.getElementById("wsfaSearchMessage");
  const dateInput = document.getElementById("rxDate");
  const fileInput = document.getElementById("rxFile");

  // Data structure to store Excel data
  let excelData = [];
  let allWsfaCodes = []; // Store all WSFA codes for filtering

  // Set today's date as default for date input
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  dateInput.value = formattedDate;

  // Load Excel file
  loadExcelFile();

  // Form submission
  form.addEventListener("submit", handleSubmit);

  // Search functionality
  wsfaSearch.addEventListener("input", filterWsfaCodes);

  // Add keyboard shortcut (Ctrl+F or Cmd+F) to focus search
  document.addEventListener("keydown", function (e) {
    // Check if Ctrl+F or Cmd+F (Mac) is pressed
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      // Prevent the default browser search
      e.preventDefault();
      // Focus the search input
      wsfaSearch.focus();
    }
  });

  /**
   * Filter WSFA dropdown options based on search text
   */
  function filterWsfaCodes() {
    const searchText = wsfaSearch.value.toLowerCase().trim();

    // Reset dropdown
    resetDropdown(wsfaSelect, "Select WSFA Code");

    if (searchText === "") {
      // Show all codes if search is empty
      allWsfaCodes.forEach((code) => {
        const option = document.createElement("option");
        option.value = String(code);
        option.textContent = String(code);
        wsfaSelect.appendChild(option);
      });
      wsfaSearchMessage.textContent = "Start typing to filter WSFA codes";
      wsfaSearch.classList.remove("no-matches");
      // Enable dropdown when showing all codes
      wsfaSelect.disabled = false;
      return;
    }

    // Filter codes based on search text
    const filteredCodes = allWsfaCodes.filter((code) =>
      String(code).toLowerCase().includes(searchText)
    );

    if (filteredCodes.length === 0) {
      // No matches found
      wsfaSearchMessage.textContent = `No WSFA codes found matching "${searchText}"`;
      wsfaSearch.classList.add("no-matches");
      // Keep dropdown disabled when no matches
      return;
    }

    // Add filtered options to dropdown
    filteredCodes.forEach((code) => {
      const option = document.createElement("option");
      option.value = String(code);
      option.textContent = String(code);
      wsfaSelect.appendChild(option);
    });

    wsfaSearchMessage.textContent = `Found ${filteredCodes.length} WSFA code(s) matching "${searchText}"`;
    wsfaSearch.classList.remove("no-matches");
    // Enable dropdown when showing filtered codes
    wsfaSelect.disabled = false;
  }

  /**
   * Load and parse the Excel file
   */
  function loadExcelFile() {
    const container = document.querySelector(".form-content");
    container.classList.add("loading");

    // Show a message to the user while loading
    showAlert("Loading data from server. This may take a moment...", "info");

    // Use secure API endpoint instead of direct Excel access
    fetch("/api/excel-data")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load data: ${response.status} ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        try {
          // Data comes pre-processed from secure API
          if (!data.codes || data.codes.length === 0) {
            throw new Error("No WSFA codes found in data");
          }

          // Skip Excel processing - we have clean data from API
          excelData = data.codes.map((code) => ({ "WSFA CODE": code }));
          allWsfaCodes = data.codes;
          processExcelData();

          // Remove loading and clear any alerts
          const container = document.querySelector(".form-content");
          container.classList.remove("loading");

          // Clear the loading message
          const existingAlert = document.querySelector(".alert");
          if (existingAlert) {
            existingAlert.remove();
          }

          return; // Exit early since we have processed data

          // Legacy Excel processing code (unused but kept for reference)
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

            // Map headers to expected field names for new structure
            const expectedHeaders = [
              "WSFA CODE",
              "HCP Name",
              "SM Name",
              "RSM NAME",
              "ASM NAME",
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

                  // Direct exact match (case-insensitive)
                  if (headerText.toLowerCase() === expected.toLowerCase()) {
                    headerMapping[header] = expected;
                    break;
                  }

                  // Check for partial matches
                  if (expectedTerms.some((term) => lowerText.includes(term))) {
                    // For WSFA CODE, look for patterns like wsfa, code, etc.
                    if (
                      expected === "WSFA CODE" &&
                      (lowerText.includes("wsfa") ||
                        lowerText.includes("code") ||
                        lowerText.includes("id"))
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For HCP Name, look for hcp specifically
                    if (expected === "HCP Name" && lowerText.includes("hcp")) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For SM Name, look for sm but exclude rsm and asm
                    if (
                      expected === "SM Name" &&
                      lowerText.includes("sm") &&
                      !lowerText.includes("rsm") &&
                      !lowerText.includes("asm") &&
                      !lowerText.includes("hcp")
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For RSM NAME, look for rsm specifically
                    if (expected === "RSM NAME" && lowerText.includes("rsm")) {
                      headerMapping[header] = expected;
                      break;
                    }

                    // For ASM NAME, look for asm specifically
                    if (
                      expected === "ASM NAME" &&
                      lowerText.includes("asm") &&
                      !lowerText.includes("rsm") // Don't match if it also contains RSM
                    ) {
                      headerMapping[header] = expected;
                      break;
                    }
                  }
                }
              }
            });

            // Fallback: If no mappings found, try direct exact matching
            if (Object.keys(headerMapping).length === 0) {
              headers.forEach((header) => {
                const headerText = String(header || "").trim();
                for (const expected of expectedHeaders) {
                  if (headerText.toLowerCase() === expected.toLowerCase()) {
                    headerMapping[header] = expected;
                    break;
                  }
                }
              });
            }

            // Emergency fallback: If still no mapping, use direct column mapping
            if (Object.keys(headerMapping).length === 0) {
              // Try to find headers by looking for key terms
              const wsfaIndex = headers.findIndex((h) =>
                String(h).toLowerCase().includes("wsfa")
              );
              const hcpIndex = headers.findIndex((h) =>
                String(h).toLowerCase().includes("hcp")
              );
              const smIndex = headers.findIndex((h) =>
                String(h).toLowerCase().includes("sm")
              );
              const rsmIndex = headers.findIndex((h) =>
                String(h).toLowerCase().includes("rsm")
              );
              const asmIndex = headers.findIndex((h) =>
                String(h).toLowerCase().includes("asm")
              );

              if (wsfaIndex >= 0 && hcpIndex >= 0) {
                if (wsfaIndex >= 0)
                  headerMapping[headers[wsfaIndex]] = "WSFA CODE";
                if (hcpIndex >= 0)
                  headerMapping[headers[hcpIndex]] = "HCP Name";
                if (smIndex >= 0) headerMapping[headers[smIndex]] = "SM Name";
                if (rsmIndex >= 0)
                  headerMapping[headers[rsmIndex]] = "RSM NAME";
                if (asmIndex >= 0)
                  headerMapping[headers[asmIndex]] = "ASM NAME";
              }
            }

            // Final fallback: Direct exact header mapping for your specific case
            if (Object.keys(headerMapping).length === 0) {
              // Since your Excel has exact headers, map them directly
              const directMapping = {
                "WSFA CODE": "WSFA CODE",
                "HCP Name": "HCP Name",
                "SM Name": "SM Name",
                "RSM NAME": "RSM NAME",
                "ASM NAME": "ASM NAME",
              };

              headers.forEach((header) => {
                const trimmedHeader = String(header || "").trim();
                if (directMapping[trimmedHeader]) {
                  headerMapping[header] = directMapping[trimmedHeader];
                }
              });
            }

            // Force correct mapping if we detect wrong mappings
            if (headerMapping && typeof headerMapping === "object") {
              // Check for incorrect mappings and fix them
              const correctedMapping = {};
              Object.entries(headerMapping).forEach(
                ([srcHeader, targetHeader]) => {
                  const srcLower = String(srcHeader || "")
                    .toLowerCase()
                    .trim();

                  // Map each field based on its specific identifier
                  if (srcLower.includes("hcp")) {
                    correctedMapping[srcHeader] = "HCP Name";
                  } else if (srcLower.includes("rsm")) {
                    correctedMapping[srcHeader] = "RSM NAME";
                  } else if (
                    srcLower.includes("asm") &&
                    !srcLower.includes("rsm")
                  ) {
                    correctedMapping[srcHeader] = "ASM NAME";
                  } else if (
                    srcLower.includes("sm") &&
                    !srcLower.includes("rsm") &&
                    !srcLower.includes("asm")
                  ) {
                    correctedMapping[srcHeader] = "SM Name";
                  } else if (
                    srcLower.includes("wsfa") ||
                    srcLower.includes("code")
                  ) {
                    correctedMapping[srcHeader] = "WSFA CODE";
                  }
                  // Keep other mappings as they were
                  else {
                    correctedMapping[srcHeader] = targetHeader;
                  }
                }
              );

              // Clear and repopulate the headerMapping object
              Object.keys(headerMapping).forEach(
                (key) => delete headerMapping[key]
              );
              Object.assign(headerMapping, correctedMapping);
            }

            // If we found header mappings, reprocess the data
            if (Object.keys(headerMapping).length > 0) {
              // Check if the headers themselves are the field names we expect
              const headersAreFieldNames = headers.some((header) => {
                const headerText = String(header || "")
                  .trim()
                  .toLowerCase();
                return (
                  headerText.includes("wsfa") ||
                  headerText.includes("hcp") ||
                  headerText.includes("sm") ||
                  headerText.includes("rsm") ||
                  headerText.includes("asm")
                );
              });

              // If headers are field names, use all data; otherwise skip first row
              const dataRows = headersAreFieldNames
                ? excelData // Use all data - headers are already field names
                : excelData.slice(1); // Skip first row if it contains headers

              // Map the data to the expected structure
              excelData = dataRows.map((row, index) => {
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
              // If we couldn't map headers, try to create a basic structure
              // This assumes the first few columns might be our data in some order
              if (headers.length >= 5) {
                excelData = excelData.map((row) => {
                  return {
                    "WSFA CODE": row[headers[0]] || "",
                    "HCP Name": row[headers[1]] || "",
                    "SM Name": row[headers[2]] || "",
                    "RSM NAME": row[headers[3]] || "",
                    "ASM NAME": row[headers[4]] || "",
                  };
                });
              }
            }

            // Process data from secure API
            allWsfaCodes = data.codes;
            excelData = data.codes.map((code) => ({ "WSFA CODE": code }));
            processExcelData();

            // Remove the loading message
            const existingAlert = document.querySelector(".alert");
            if (existingAlert) {
              existingAlert.remove();
            }

            // Excel data loaded successfully
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
   * Process Excel data and populate WSFA Code dropdown
   */
  function processExcelData() {
    if (!excelData || excelData.length === 0) {
      showAlert("No data found in the Excel file.", "danger");
      return;
    }

    const firstRow = excelData[0];
    const hasExpectedFields =
      firstRow &&
      (firstRow["WSFA CODE"] !== undefined ||
        firstRow["HCP Name"] !== undefined ||
        firstRow["SM Name"] !== undefined ||
        firstRow["RSM NAME"] !== undefined ||
        firstRow["ASM NAME"] !== undefined);

    if (!hasExpectedFields) {
      showAlert(
        "The Excel data does not have the expected structure. Please check the Excel file format and try again.",
        "danger"
      );
      return;
    }

    const wsfaCodes = [
      ...new Set(
        excelData
          .map((row) => row["WSFA CODE"])
          .filter((code) => code && String(code).trim() !== "")
      ),
    ];

    if (wsfaCodes.length === 0) {
      showAlert(
        "No WSFA codes found in the Excel file. Please check the Excel file content and try again.",
        "danger"
      );
      return;
    }

    // Store all WSFA codes for filtering
    allWsfaCodes = wsfaCodes.sort((a, b) => String(a).localeCompare(String(b)));

    // Populate dropdown with all codes initially
    resetDropdown(wsfaSelect, "Select WSFA Code");
    allWsfaCodes.forEach((code) => {
      const option = document.createElement("option");
      option.value = String(code);
      option.textContent = String(code);
      wsfaSelect.appendChild(option);
    });
    wsfaSelect.disabled = false;

    // Store the original Excel data for exact matching
    window.originalExcelData = excelData;
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Get the selected WSFA code and find corresponding data
    const selectedWsfaCode = wsfaSelect.value;

    // Try to find the row with flexible comparison
    let selectedRow = excelData.find((row) => {
      const rowCode = String(row["WSFA CODE"] || "").trim();
      const selectedCode = String(selectedWsfaCode || "").trim();
      return rowCode === selectedCode;
    });

    // If not found in current data, try original data
    if (!selectedRow && window.originalExcelData) {
      selectedRow = window.originalExcelData.find((row) => {
        const rowCode = String(row["WSFA CODE"] || "").trim();
        const selectedCode = String(selectedWsfaCode || "").trim();
        return rowCode === selectedCode;
      });
    }

    if (!selectedRow) {
      showAlert(
        `Selected WSFA code "${selectedWsfaCode}" not found in data. Please try selecting again.`,
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

    // Helper function to find HCP Name field with flexible matching
    function findHcpName(row) {
      const possibleNames = [
        "HCP Name",
        "HCP",
        "Doctor Name",
        "Doctor",
        "Physician Name",
        "Physician",
      ];

      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null) {
          return row[name] || ""; // Return empty string if value is empty
        }
      }

      // If no exact match, try partial matching
      for (const fieldName of Object.keys(row)) {
        const lowerFieldName = fieldName.toLowerCase();

        if (
          lowerFieldName.includes("hcp") ||
          lowerFieldName.includes("doctor") ||
          lowerFieldName.includes("physician")
        ) {
          if (row[fieldName] !== undefined && row[fieldName] !== null) {
            return row[fieldName] || ""; // Return empty string if value is empty
          }
        }
      }

      return "";
    }

    const hcpNameResult = findHcpName(selectedRow);

    const formData = {
      timestamp: new Date().toISOString(),
      wsfaCode: selectedWsfaCode,
      hcpName: hcpNameResult,
      smName: selectedRow["SM Name"] || "",
      rsmName: selectedRow["RSM NAME"] || "",
      asmName: selectedRow["ASM NAME"] || "",
      rxDate: dateInput.value,
      rxFile: s3Url,
    };

    sendToGoogleSheets(formData)
      .then((response) => {
        showAlert("Prescription submitted successfully!", "success");
        form.reset();
        dateInput.value = formattedDate;
        // Clear search and reset dropdown
        wsfaSearch.value = "";
        filterWsfaCodes();
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
    // Use the server proxy endpoint (hides Google Script URL)
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key]);
    });
    return fetch("/submit-form", {
      method: "POST",
      body: data,
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
    if (!wsfaSelect.value) {
      showAlert("Please select a WSFA Code.", "danger");
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
});
