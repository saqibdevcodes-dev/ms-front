<template>
  <DefaultLayout title="Overall MIS Sheet">
    <div class="container mx-auto px-4 py-6">
      <div class="">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-semibold text-gray-800">Overall MIS Sheet</h1>
          <div class="flex space-x-2">
            <div class="relative">
              <InputText
                v-model="searchQuery"
                placeholder="Search reports..."
                class="p-2 border rounded w-64"
              />
              <span class="absolute right-3 top-2.5 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
            </div>
            <Button
              v-if="selectedRows.length > 0"
              label="Export Selected"
              type="button"
              @click="showExportOptions = true"
              class="bg-blue-600"
            />
          </div>
        </div>

        <!-- Filters Section -->
        <div class="mb-6 p-4 rounded-lg">
          <div class="flex flex-wrap gap-4">
            <!-- Branch Filter -->

            <!-- Date Range Filter -->

            <!-- Filter Buttons -->
            <div class="flex items-end space-x-2">
              <Button
                label="See Overall MIS Sheet"
                type="button"
                @click="generateConsolidatedReports"
                :disabled="!hasFilteredReports"
                :class="{
                  'bg-green-600': hasFilteredReports,
                  'bg-gray-400 cursor-not-allowed': !hasFilteredReports
                }"
              />
            </div>
          </div>
        </div>

        <!-- Reports Grid -->
        <div class="ag-theme-quartz w-full h-[calc(100vh-450px)]">
          <AgGridVue
            v-model:grid-options="gridOptions"
            :columnDefs="columnDefs"
            :rowData="displayReports"
            @grid-ready="onGridReady"
            @selection-changed="onSelectionChanged"
            class="ag-grid-style"
            autoSizeStrategy="fitCellContents"
          ></AgGridVue>
        </div>
      </div>

      <!-- Consolidated Results Section -->
      <div
        v-if="showConsolidatedResults"
        class="bg-white rounded-lg shadow-md p-6 consolidated-results mt-6"
      >
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-800">Combined Results</h2>
          <div class="flex space-x-2">
            <Button
              label="Export Results"
              type="button"
              @click="exportConsolidatedResults"
              class="bg-green-600"
            />
            <Button
              label="Hide Results"
              type="button"
              @click="showConsolidatedResults = false"
              class="bg-gray-500"
            />
          </div>
        </div>

        <!-- Consolidated Data Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <!-- First row: Section headers -->
                <!-- Show additional headers first -->
                <th
                  :colspan="consolidatedTableHeaders.length"
                  class="py-2 px-4 border-b text-center font-bold text-gray-800 bg-green-100"
                >
                  Additional Information
                </th>
                <!-- Then show section headers -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`section-header-${sIndex}`"
                >
                  <th
                    :colspan="section.questions.length * 2 + 3"
                    class="py-2 px-4 border-b text-center font-bold text-gray-800 bg-blue-100"
                  >
                    {{ section.name }}
                  </th>
                </template>
                <!-- Report Total header -->
                <th
                  colspan="3"
                  class="py-2 px-4 border-b text-center font-bold text-gray-800 bg-purple-100"
                >
                  Report Total
                </th>
              </tr>
              <tr class="bg-gray-50">
                <!-- Second row: Original headers first -->
                <th
                  v-for="(header, index) in consolidatedTableHeaders"
                  :key="`header-${index}`"
                  class="py-2 px-3 border-b text-left font-medium text-gray-700 bg-green-50"
                  :class="{ 'min-w-[300px]': header.key === 'address' || header.key === 'branch' }"
                >
                  {{ header.display }}
                </th>

                <!-- Then question headers and section total headers -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`section-${sIndex}`"
                >
                  <!-- Question headers -->
                  <template
                    v-for="(question, qIndex) in section.questions"
                    :key="`question-${sIndex}-${qIndex}`"
                  >
                    <th
                      colspan="2"
                      class="py-2 px-2 border-b text-center font-medium text-gray-700 bg-blue-50"
                    >
                      {{ question.number }} {{ question.title }}
                    </th>
                  </template>
                  <!-- Section total header -->
                  <th
                    colspan="3"
                    class="py-2 px-2 border-b text-center font-medium text-gray-700 bg-blue-200"
                  >
                    Section {{ sIndex + 1 }} Total
                  </th>
                </template>
                <!-- Report total header -->
                <th
                  colspan="3"
                  class="py-2 px-2 border-b text-center font-medium text-gray-700 bg-purple-200"
                >
                  Report Total
                </th>
              </tr>
              <tr class="bg-gray-100">
                <!-- Third row: Column subheaders -->
                <!-- Original column subheaders -->
                <template
                  v-for="(header, index) in consolidatedTableHeaders"
                  :key="`subheader-${index}`"
                >
                  <th class="py-1 px-3 border-b bg-green-50"></th>
                </template>

                <!-- Question column subheaders -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`app-section-${sIndex}`"
                >
                  <template
                    v-for="(question, qIndex) in section.questions"
                    :key="`app-question-${sIndex}-${qIndex}`"
                  >
                    <th
                      class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 w-10"
                    >
                      App
                    </th>
                    <th
                      class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 w-10"
                    >
                      Ach
                    </th>
                  </template>

                  <!-- Section total subheaders -->
                  <th
                    class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 bg-blue-100"
                  >
                    App Total
                  </th>
                  <th
                    class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 bg-blue-100"
                  >
                    Ach Total
                  </th>
                  <th
                    class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 bg-blue-100"
                  >
                    % Total
                  </th>
                </template>

                <!-- Report total subheaders -->
                <th
                  class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 bg-purple-100"
                >
                  App Total
                </th>
                <th
                  class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 bg-purple-100"
                >
                  Ach Total
                </th>
                <th
                  class="py-1 px-2 border-b text-center font-medium text-xs text-gray-700 bg-purple-100"
                >
                  % Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in consolidatedData" :key="index" class="hover:bg-gray-50">
                <!-- Original columns data first -->
                <td
                  v-for="(header, headerIndex) in consolidatedTableHeaders"
                  :key="`data-${headerIndex}`"
                  class="py-2 px-3 border-b"
                  :class="[
                    (header.key === 'averageScore' || header.key === 'overall_performance') &&
                    item._rawContent?.reports?.some((s: any) => checkSectionFatalError(s))
                      ? 'bg-red-500 text-white'
                      : header.key === 'averageScore'
                        ? getScoreColorClass(item[header.key])
                        : '',
                    { 'min-w-[250px]': header.key === 'address' || header.key === 'branch' }
                  ]"
                >
                  <!-- Render based on field type -->
                  <template v-if="Array.isArray(item[header.key])">
                    <ul class="list-disc list-inside">
                      <li v-for="(listItem, i) in item[header.key]" :key="i">{{ listItem }}</li>
                    </ul>
                  </template>
                  <template
                    v-else-if="
                      (header.key === 'averageScore' || header.key === 'overall_performance') &&
                      item._rawContent?.reports?.some((s: any) => checkSectionFatalError(s))
                    "
                  >
                    ⚠️ FATAL ERROR
                  </template>
                  <template
                    v-else-if="
                      header.key === 'averageScore' || header.key === 'overall_performance'
                    "
                  >
                    {{ item[header.key] }}%
                  </template>
                  <template v-else>
                    {{ item[header.key] }}
                  </template>
                </td>

                <!-- Then section questions data -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`data-section-${sIndex}`"
                >
                  <template
                    v-for="(question, qIndex) in section.questions"
                    :key="`data-question-${sIndex}-${qIndex}`"
                  >
                    <td class="py-2 px-2 border-b text-center">
                      {{ getQuestionValue(item, section.id, question.id, 'applicable') }}
                    </td>
                    <td
                      class="py-2 px-2 border-b text-center"
                      :class="
                        getScoreColorClass(
                          getQuestionScorePercentage(item, section.id, question.id)
                        )
                      "
                    >
                      {{ getQuestionValue(item, section.id, question.id, 'achieved') }}
                    </td>
                  </template>
                  <!-- Add section totals -->
                  <td class="py-2 px-2 border-b text-center font-medium bg-blue-50">
                    {{ getSectionTotalValue(item, section.id, 'applicable') }}
                  </td>
                  <td class="py-2 px-2 border-b text-center font-medium bg-blue-50">
                    {{ getSectionTotalValue(item, section.id, 'achieved') }}
                  </td>
                  <td
                    class="py-2 px-2 border-b text-center font-medium bg-blue-50"
                    :class="getScoreColorClass(getSectionScorePercentage(item, section.id))"
                  >
                    {{ getSectionScorePercentage(item, section.id).toFixed(2) }}%
                  </td>
                </template>

                <!-- Report row totals -->
                <td class="py-2 px-2 border-b text-center font-medium bg-purple-50">
                  {{ calculateReportRowTotal(item, 'applicable') }}
                </td>
                <td class="py-2 px-2 border-b text-center font-medium bg-purple-50">
                  {{ calculateReportRowTotal(item, 'achieved') }}
                </td>
                <td
                  class="py-2 px-2 border-b text-center font-medium bg-purple-50"
                  :class="getScoreColorClass(calculateReportRowPercentage(item))"
                >
                  {{ calculateReportRowPercentage(item).toFixed(2) }}%
                </td>
              </tr>

              <!-- Overall Totals Row -->
              <tr class="bg-gray-100 font-bold">
                <!-- Headers for Overall Totals -->
                <td
                  :colspan="consolidatedTableHeaders.length"
                  class="py-2 px-3 border-b text-right"
                >
                  Overall Totals:
                </td>

                <!-- Question cells - leave empty -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`totals-section-${sIndex}`"
                >
                  <template
                    v-for="(question, qIndex) in section.questions"
                    :key="`totals-question-${sIndex}-${qIndex}`"
                  >
                    <td class="py-2 px-2 border-b text-center"></td>
                    <td class="py-2 px-2 border-b text-center"></td>
                  </template>

                  <!-- Section overall totals -->
                  <td class="py-2 px-2 border-b text-center font-medium bg-blue-100">
                    {{ calculateSectionTotalAllReports(section.id, 'applicable') }}
                  </td>
                  <td class="py-2 px-2 border-b text-center font-medium bg-blue-100">
                    {{ calculateSectionTotalAllReports(section.id, 'achieved') }}
                  </td>
                  <td
                    class="py-2 px-2 border-b text-center font-medium bg-blue-100"
                    :class="getScoreColorClass(calculateSectionOverallPercentage(section.id))"
                  >
                    {{ calculateSectionOverallPercentage(section.id).toFixed(2) }}%
                  </td>
                </template>

                <!-- Overall report totals -->
                <td class="py-2 px-2 border-b text-center font-medium bg-purple-100">
                  {{ calculateGrandTotalAllSections('applicable') }}
                </td>
                <td class="py-2 px-2 border-b text-center font-medium bg-purple-100">
                  {{ calculateGrandTotalAllSections('achieved') }}
                </td>
                <td
                  class="py-2 px-2 border-b text-center font-medium bg-purple-100"
                  :class="getScoreColorClass(calculateGrandTotalPercentage())"
                >
                  {{ calculateGrandTotalPercentage().toFixed(2) }}%
                </td>
              </tr>

              <!-- Grand Total Row across all sections -->
              <tr v-if="showGrandTotalRow" class="bg-gray-200 font-bold">
                <!-- Headers for Grand Total -->
                <td
                  :colspan="consolidatedTableHeaders.length"
                  class="py-2 px-3 border-b text-right"
                >
                  Grand Total (All Sections):
                </td>

                <!-- Question cells - leave empty -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`grand-totals-section-${sIndex}`"
                >
                  <template
                    v-for="(question, qIndex) in section.questions"
                    :key="`grand-totals-question-${sIndex}-${qIndex}`"
                  >
                    <td class="py-2 px-2 border-b text-center"></td>
                    <td class="py-2 px-2 border-b text-center"></td>
                  </template>

                  <!-- Only show section totals in the section area, not in the grand total row -->
                  <td class="py-2 px-2 border-b text-center"></td>
                  <td class="py-2 px-2 border-b text-center"></td>
                  <td class="py-2 px-2 border-b text-center"></td>
                </template>

                <!-- Grand total values - show only in the report total area -->
                <td class="py-2 px-2 border-b text-center font-medium bg-purple-200">
                  {{ calculateGrandTotalAllSections('applicable') }}
                </td>
                <td class="py-2 px-2 border-b text-center font-medium bg-purple-200">
                  {{ calculateGrandTotalAllSections('achieved') }}
                </td>
                <td
                  class="py-2 px-2 border-b text-center font-medium bg-purple-200"
                  :class="getScoreColorClass(calculateGrandTotalPercentage())"
                >
                  {{ calculateGrandTotalPercentage().toFixed(2) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Visualization Section -->
        <div class="mt-8">
          <h3 class="text-lg font-medium text-gray-800 mb-4">Performance Visualization</h3>
          <div class="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
            <!-- Placeholder for charts/visualization -->
            <p class="text-gray-500">
              Charts and visualizations would appear here based on the combined data
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Options Dialog -->
    <Dialog
      v-model:visible="showExportOptions"
      modal
      header="Export Options"
      :style="{ width: '450px' }"
    >
      <div class="flex flex-col gap-4 p-4">
        <Button label="Export to PDF" @click="exportSelectedReportsToPDF" class="bg-red-600" />
        <Button
          label="Export to Excel"
          @click="showColorCustomizationDialog = true"
          class="bg-green-600"
        />
        <Button label="Export Images" @click="exportSelectedReportsImages" class="bg-blue-600" />
        <Button label="Export Videos" @click="exportSelectedReportsVideos" class="bg-purple-600" />
      </div>
    </Dialog>

    <!-- Enhanced Color Customization Dialog -->
    <Dialog
      v-model:visible="showColorCustomizationDialog"
      modal
      header="🎨 Excel Export Color Customization"
      :style="{ width: '95%', maxWidth: '1400px', minHeight: '80vh' }"
      class="color-customization-dialog"
    >
      <div class="flex flex-col gap-6 p-6">
        <!-- Header Section with Description -->
        <div
          class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200"
        >
          <h3 class="text-lg font-semibold text-blue-800 mb-2">
            🎯 Customize Your Excel Export Colors
          </h3>
          <p class="text-blue-600 text-sm">
            Choose colors that match your brand or preferences. The preview below shows how your
            Excel file will look with the selected colors.
          </p>
        </div>

        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Left Panel: Color Controls -->
          <div class="lg:w-1/3 flex flex-col gap-6">
            <!-- Color Presets Section -->
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 class="text-base font-semibold mb-3 text-gray-800">🎨 Quick Presets</h4>
              <div class="grid grid-cols-1 gap-3">
                <button
                  @click="applyPresetColors('default')"
                  class="preset-button"
                  style="background: linear-gradient(135deg, #c6e6c1 0%, #c1d5e5 50%, #e5c1e5 100%)"
                >
                  <span class="preset-name">Default</span>
                  <div class="preset-colors">
                    <div class="color-dot" style="background: #c6e6c1"></div>
                    <div class="color-dot" style="background: #c1d5e5"></div>
                    <div class="color-dot" style="background: #e5c1e5"></div>
                  </div>
                </button>

                <button
                  @click="applyPresetColors('professional')"
                  class="preset-button"
                  style="background: linear-gradient(135deg, #1f4e79 0%, #2f5597 50%, #366092 100%)"
                >
                  <span class="preset-name">Professional</span>
                  <div class="preset-colors">
                    <div class="color-dot" style="background: #1f4e79"></div>
                    <div class="color-dot" style="background: #2f5597"></div>
                    <div class="color-dot" style="background: #366092"></div>
                  </div>
                </button>

                <button
                  @click="applyPresetColors('vibrant')"
                  class="preset-button"
                  style="background: linear-gradient(135deg, #7030a0 0%, #00b0f0 50%, #ffc000 100%)"
                >
                  <span class="preset-name">Vibrant</span>
                  <div class="preset-colors">
                    <div class="color-dot" style="background: #7030a0"></div>
                    <div class="color-dot" style="background: #00b0f0"></div>
                    <div class="color-dot" style="background: #ffc000"></div>
                  </div>
                </button>

                <button
                  @click="applyPresetColors('monochrome')"
                  class="preset-button"
                  style="background: linear-gradient(135deg, #404040 0%, #595959 50%, #262626 100%)"
                >
                  <span class="preset-name">Monochrome</span>
                  <div class="preset-colors">
                    <div class="color-dot" style="background: #404040"></div>
                    <div class="color-dot" style="background: #595959"></div>
                    <div class="color-dot" style="background: #262626"></div>
                  </div>
                </button>

                <button
                  @click="applyPresetColors('dark')"
                  class="preset-button"
                  style="background: linear-gradient(135deg, #134f5c 0%, #0f243e 50%, #4a266a 100%)"
                >
                  <span class="preset-name">Dark Theme</span>
                  <div class="preset-colors">
                    <div class="color-dot" style="background: #134f5c"></div>
                    <div class="color-dot" style="background: #0f243e"></div>
                    <div class="color-dot" style="background: #4a266a"></div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Header Colors Section -->
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 class="text-base font-semibold mb-3 text-gray-800">📋 Header Colors</h4>
              <div class="grid grid-cols-1 gap-4">
                <div class="color-picker-group">
                  <label class="color-label">Report Info Header</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.reportInfoHeader" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.reportInfoHeader}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.reportInfoHeader }}</span>
                  </div>
                </div>

                <div class="color-picker-group">
                  <label class="color-label">Section Header</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.sectionHeader" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.sectionHeader}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.sectionHeader }}</span>
                  </div>
                </div>

                <div class="color-picker-group">
                  <label class="color-label">Total Header</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.totalHeader" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.totalHeader}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.totalHeader }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Background Colors Section -->
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 class="text-base font-semibold mb-3 text-gray-800">🎨 Background Colors</h4>
              <div class="grid grid-cols-1 gap-4">
                <div class="color-picker-group">
                  <label class="color-label">Report Info Background</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.reportInfoBg" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.reportInfoBg}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.reportInfoBg }}</span>
                  </div>
                </div>

                <div class="color-picker-group">
                  <label class="color-label">Section Background</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.sectionBg" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.sectionBg}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.sectionBg }}</span>
                  </div>
                </div>

                <div class="color-picker-group">
                  <label class="color-label">Total Background</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.totalBg" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.totalBg}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.totalBg }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Score Colors Section -->
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 class="text-base font-semibold mb-3 text-gray-800">📊 Score Colors</h4>
              <div class="grid grid-cols-1 gap-4">
                <div class="color-picker-group">
                  <label class="color-label">High Score (≥80%)</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.highScore" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.highScore}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.highScore }}</span>
                  </div>
                </div>

                <div class="color-picker-group">
                  <label class="color-label">Medium Score (60-79%)</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.mediumScore" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.mediumScore}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.mediumScore }}</span>
                  </div>
                </div>

                <div class="color-picker-group">
                  <label class="color-label">Low Score (≤60%)</label>
                  <div class="color-input-wrapper">
                    <ColorPicker v-model="excelColorScheme.lowScore" class="color-picker" />
                    <div
                      class="color-preview"
                      :style="{ backgroundColor: `#${excelColorScheme.lowScore}` }"
                    ></div>
                    <span class="color-hex">#{{ excelColorScheme.lowScore }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Panel: Live Preview -->
          <div class="lg:w-2/3 flex flex-col gap-4">
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 class="text-base font-semibold mb-3 text-gray-800">👁️ Live Preview</h4>
              <p class="text-sm text-gray-600 mb-4">
                This is how your Excel export will look with the selected colors:
              </p>

              <div
                class="excel-preview-container border rounded-lg overflow-hidden shadow-inner bg-gray-50"
              >
                <!-- Excel Preview Header -->
                <div class="bg-white p-3 border-b border-gray-200">
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full bg-red-400"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div class="w-3 h-3 rounded-full bg-green-400"></div>
                    <span class="ml-2 text-sm font-medium text-gray-700"
                      >Overall MIS Sheet.xlsx</span
                    >
                  </div>
                  <div class="text-xs text-gray-500">
                    <div>📊 Total Reports: {{ consolidatedStats.totalReports || 4 }}</div>
                    <div>📈 Average Score: {{ consolidatedStats.averageScore || 68.4 }}%</div>
                    <div>📅 Date Range: {{ consolidatedStats.dateRange || 'All Time' }}</div>
                  </div>
                </div>

                <!-- Excel Table Preview -->
                <div class="overflow-auto max-h-96">
                  <table class="w-full excel-preview-table">
                    <thead>
                      <!-- Main Headers Row -->
                      <tr>
                        <th
                          :colspan="Math.max(consolidatedTableHeaders.length, 3)"
                          :style="{
                            backgroundColor: `#${excelColorScheme.reportInfoHeader}`,
                            color: '#FFFFFF'
                          }"
                          class="excel-header-cell"
                        >
                          📋 Additional Information
                        </th>
                        <th
                          :style="{
                            backgroundColor: `#${excelColorScheme.sectionHeader}`,
                            color: '#FFFFFF'
                          }"
                          class="excel-header-cell"
                        >
                          Customer Service
                        </th>
                        <th
                          :style="{
                            backgroundColor: `#${excelColorScheme.sectionHeader}`,
                            color: '#FFFFFF'
                          }"
                          class="excel-header-cell"
                        >
                          Store Appearance
                        </th>
                        <th
                          :style="{
                            backgroundColor: `#${excelColorScheme.totalHeader}`,
                            color: '#FFFFFF'
                          }"
                          class="excel-header-cell"
                        >
                          Total Score
                        </th>
                      </tr>

                      <!-- Sub Headers Row -->
                      <tr>
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.reportInfoBg}` }"
                          class="excel-subheader-cell"
                        >
                          Report Name
                        </th>
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.reportInfoBg}` }"
                          class="excel-subheader-cell"
                        >
                          Branch
                        </th>
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.reportInfoBg}` }"
                          class="excel-subheader-cell"
                        >
                          Date of Visit
                        </th>
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.reportInfoBg}` }"
                          class="excel-subheader-cell"
                        >
                          Time of Visit
                        </th>
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.sectionBg}` }"
                          class="excel-subheader-cell"
                        >
                          Score (%)
                        </th>
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.sectionBg}` }"
                          class="excel-subheader-cell"
                        >
                          Score (%)
                        </th>
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.totalBg}` }"
                          class="excel-subheader-cell"
                        >
                          Overall (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- Sample Data Rows -->
                      <template v-if="consolidatedData.length > 0">
                        <tr
                          v-for="(item, index) in consolidatedData.slice(0, 3)"
                          :key="`preview-${index}`"
                        >
                          <td class="excel-data-cell text-left">
                            {{ item.reportName || 'Sample Report' }}
                          </td>
                          <td class="excel-data-cell">
                            {{ item.branch || 'Branch ' + (index + 1) }}
                          </td>
                          <td class="excel-data-cell">
                            {{ item.dateOfVisit || '2024-01-' + (10 + index) }}
                          </td>
                          <td class="excel-data-cell">{{ item.timeOfVisit || '10:00' }}</td>
                          <td
                            class="excel-data-cell"
                            :style="{ color: `#${getScoreColor(85 - index * 15)}` }"
                          >
                            {{ (85 - index * 15).toFixed(1) }}%
                          </td>
                          <td
                            class="excel-data-cell"
                            :style="{ color: `#${getScoreColor(80 - index * 10)}` }"
                          >
                            {{ (80 - index * 10).toFixed(1) }}%
                          </td>
                          <td
                            class="excel-data-cell"
                            :style="{ color: `#${getScoreColor(82 - index * 12)}` }"
                          >
                            {{ (82 - index * 12).toFixed(1) }}%
                          </td>
                        </tr>
                      </template>

                      <!-- Fallback sample rows if no data -->
                      <template v-if="consolidatedData.length === 0">
                        <tr v-for="rowIndex in 3" :key="`sample-row-${rowIndex}`">
                          <td class="excel-data-cell text-left">Sample Report {{ rowIndex }}</td>
                          <td class="excel-data-cell">Branch {{ rowIndex }}</td>
                          <td class="excel-data-cell">2024-01-{{ 10 + rowIndex }}</td>
                          <td class="excel-data-cell">10:00</td>
                          <td
                            class="excel-data-cell"
                            :style="{ color: `#${getScoreColor(90 - rowIndex * 15)}` }"
                          >
                            {{ (90 - rowIndex * 15).toFixed(1) }}%
                          </td>
                          <td
                            class="excel-data-cell"
                            :style="{ color: `#${getScoreColor(85 - rowIndex * 10)}` }"
                          >
                            {{ (85 - rowIndex * 10).toFixed(1) }}%
                          </td>
                          <td
                            class="excel-data-cell"
                            :style="{ color: `#${getScoreColor(87 - rowIndex * 12)}` }"
                          >
                            {{ (87 - rowIndex * 12).toFixed(1) }}%
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-between items-center">
              <Button
                label="🔄 Reset to Default"
                @click="resetToDefault"
                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              />
              <div class="flex gap-3">
                <Button
                  label="❌ Cancel"
                  @click="showColorCustomizationDialog = false"
                  class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                />
                <Button
                  label="📊 Export with These Colors"
                  @click="performExcelExport"
                  class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import Button from '@/components/Buttons/Button.vue'
import { Client } from '@/stores/client'
import { Auth } from '@/stores/auth'
import { Reports } from '@/stores/reports'
import { Branches } from '@/stores/branches'
import { DateFormatter } from '@/utils/date-formatter'
import router from '@/router'
import { Toast } from '@/utils/toast'
import InputText from 'primevue/inputtext'
import { ExcelExport } from '@/stores/reports/excelExport'
import pdfExport from '@/stores/reports/pdfExport'
import mediaExport from '@/stores/reports/mediaExport'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Dialog from 'primevue/dialog'
import ExcelJS from 'exceljs'
import FileSaver from 'file-saver'
import type { GridParams } from 'ag-grid-community'
import ColorPicker from 'primevue/colorpicker'
import { useColorsScore } from '@/stores/colorsScore'
import { Ranges } from '@/stores/ranges'

// Define component name to fix linter warning
defineOptions({
  name: 'ConsolidatedReportsView'
})

// State
const reports = ref([])
const allReports = ref([])
const selectedRows = ref([])
const searchQuery = ref('')
const loading = ref(false)
const errorMessage = ref(null)
const gridApi = ref<any>(null)
const showExportOptions = ref(false)
const showColorCustomizationDialog = ref(false)
const showConsolidatedResults = ref(false)
const consolidatedData = ref<any[]>([])
const consolidatedStats = ref({
  totalReports: 0,
  averageScore: 0,
  dateRange: 'All Time'
})
const consolidatedTableHeaders = ref<{ key: string; display: string }[]>([])
const consolidatedSections = ref<
  {
    id: string
    name: string
    questions: { id: string; number: string; title: string }[]
  }[]
>([])
const showGrandTotalRow = ref(false)
const excelColorScheme = ref({
  reportInfoHeader: 'C6E6C1', // Green for Report Info header
  sectionHeader: 'C1D5E5', // Blue for Section headers
  totalHeader: 'E5C1E5', // Purple for Total header
  reportInfoBg: 'F0F8EF', // Light green for Report Info cells
  sectionBg: 'EFF4F9', // Light blue for Section cells
  totalBg: 'F5EDF5', // Light purple for Total cells
  highScore: '006100', // Dark green for high scores
  mediumScore: 'CC7A00', // Orange for medium scores
  lowScore: 'CC0000' // Red for low scores
})

// For branch-based filtering
const assignedBranches = ref<any[]>([])

// Filter state
interface Branch {
  id: number | string | null
  name: string
}

const selectedBranch = ref<Branch | null>(null)
const branchOptions = ref<Branch[]>([{ id: null, name: 'All Branches' }])
const dateRange = ref({
  from: null as Date | null,
  to: null as Date | null
})

// Grid API with proper typing (or any for now as a fallback)
const safeGridApi = {
  showLoadingOverlay: () => {
    if (gridApi.value) {
      setTimeout(() => {
        try {
          gridApi.value.showLoadingOverlay()
        } catch (err) {
          console.error('Error showing loading overlay:', err)
        }
      }, 0)
    }
  },
  hideOverlay: () => {
    if (gridApi.value) {
      setTimeout(() => {
        try {
          gridApi.value.hideOverlay()
        } catch (err) {
          console.error('Error hiding overlay:', err)
        }
      }, 0)
    }
  },
  showNoRowsOverlay: () => {
    if (gridApi.value) {
      setTimeout(() => {
        try {
          gridApi.value.showNoRowsOverlay()
        } catch (err) {
          console.error('Error showing no rows overlay:', err)
        }
      }, 0)
    }
  }
}

// Event handlers
const onGridReady = (params: any) => {
  gridApi.value = params.api

  // Configure the grid API to work with filtering properly
  if (gridApi.value) {
    // Set filter manager for proper filtering behavior
    gridApi.value.setFilterModel({})

    // Store grid API reference
    console.log('Grid API ready, initializing...')
  }

  // Use setTimeout to ensure grid is ready before loading data
  safeGridApi.showLoadingOverlay()
  fetchReports()
}

const onRowClicked = (event: any) => {
  if (event?.data?.id) {
    const reportId = event.data.id
    router.push(`/client/user-reports/view/${reportId}`)
  }
}

const onSelectionChanged = (event: any) => {
  // Get the selected rows from the grid API
  if (event && event.api) {
    const selected = event.api.getSelectedRows() || []
    console.log(`Selection changed: ${selected.length} rows selected`)
    selectedRows.value = selected

    // Log selection details for debugging
    if (selected.length > 0) {
      console.log(`First selected report ID: ${selected[0].id}`)
    }
  }
}

// Apply filters with setTimeout to prevent redraw conflict
const applyFilters = () => {
  // Clear selections when filters change
  if (gridApi.value) {
    gridApi.value.deselectAll()
    selectedRows.value = []
  }

  safeGridApi.showLoadingOverlay()
  fetchReports()
}

// Fatal Error Helper Functions
const isFatalErrorSection = (sectionName: string) => {
  return sectionName?.toLowerCase().includes('fatal error')
}

const checkSectionFatalError = (section: any) => {
  const sectionName = section?.name || section?.heading || ''
  if (!section || !isFatalErrorSection(sectionName)) {
    return false
  }

  const questions = section.questions || section.data || []
  return questions.some((q: any) => {
    const answer = q.answer?.toLowerCase() || q.response?.toLowerCase() || ''
    return answer === 'yes' || answer === 'true'
  })
}

const checkReportHasFatalError = (report: any) => {
  if (!report || !report.content) return false

  try {
    const content = typeof report.content === 'string' ? JSON.parse(report.content) : report.content
    const sections = content.reports || content.sections || []
    return sections.some((section: any) => checkSectionFatalError(section))
  } catch (error) {
    console.error('Error parsing report content for fatal error check:', error)
    return false
  }
}

// Computed properties
const currentUser = computed(() => Auth().user)
const client = computed(() => Client().selected_client)

// Grid options
const gridOptions = ref({
  defaultColDef: {
    sortable: true,
    resizable: true,
    filter: true
  },
  rowSelection: 'multiple',
  pagination: true,
  paginationPageSize: 20,
  suppressCellFocus: false,
  enableCellTextSelection: true,
  rowMultiSelectWithClick: false,
  suppressRowClickSelection: true,
  suppressModelUpdateAfterUpdateTransaction: true,
  suppressAnimationFrame: false,
  debounceVerticalScrollbar: true,
  batchUpdateWaitMillis: 50,
  asyncTransactionWaitMillis: 50,
  headerCheckboxSelection: true, // Enable header checkbox selection
  headerCheckboxSelectionFilteredOnly: true, // Only select filtered items when using header checkbox
  onGridSizeChanged: (params: any) => {
    try {
      setTimeout(() => params.api.sizeColumnsToFit(), 100)
    } catch (err) {
      console.error('Error fitting columns to grid:', err)
    }
  },
  suppressPropertyNamesCheck: true
})

// Function to extract and set up dynamic columns from customFields
const setupDynamicColumns = () => {
  // Skip if no data is available yet
  if (!allReports.value || allReports.value.length === 0) {
    console.log('No reports data available to set up dynamic columns')
    return
  }

  try {
    console.log('Setting up dynamic columns based on customFields')
    // Get the first report to extract customFields
    const firstReport = allReports.value[0]

    // Skip if no content is available
    if (!firstReport?.content) {
      console.log('No content available in reports to extract customFields')
      return
    }

    // Parse content if it's a string
    const content =
      typeof firstReport.content === 'string'
        ? JSON.parse(firstReport.content)
        : firstReport.content

    // Skip if no customFields are available
    if (
      !content.customFields ||
      !Array.isArray(content.customFields) ||
      content.customFields.length === 0
    ) {
      console.log('No customFields found in report content')
      return
    }

    console.log('Found customFields:', content.customFields)

    // Create a fresh base set of columns that excludes any previously added dynamic columns
    // Only keep the default columns that we know should be there
    const staticColumns = [
      // Keep the Sr. column (first column)
      columnDefs.value.find((col) => col.headerName === 'Sr.'),
      // Keep the Report Name column (second column)
      columnDefs.value.find((col) => col.headerName === 'Report Name'),
      // Keep the Month column
      columnDefs.value.find((col) => col.headerName === 'Month'),
      // Keep the Overall Performance column
      columnDefs.value.find((col) => col.headerName === 'Overall Performance'),
      // Keep the Video column
      columnDefs.value.find((col) => col.headerName === 'Video'),
      // Keep the Picture column
      columnDefs.value.find((col) => col.headerName === 'Picture'),
      // Keep the Audio column
      columnDefs.value.find((col) => col.headerName === 'Audio')
    ].filter(Boolean) // Remove any undefined values

    // Find where to insert the dynamic columns (after the Report Name column)
    const insertIndex = staticColumns.findIndex((col) => col.headerName === 'Report Name') + 1

    // Get unique headerFields to avoid duplicates
    const uniqueHeaderFields = new Set()
    const uniqueCustomFields: any[] = []

    // Filter out duplicates using the headerField as the unique identifier
    content.customFields.forEach((field) => {
      if (field.headerField && !uniqueHeaderFields.has(field.headerField)) {
        uniqueHeaderFields.add(field.headerField)
        uniqueCustomFields.push(field)
      }
    })

    console.log(
      `Found ${uniqueCustomFields.length} unique custom fields out of ${content.customFields.length} total`
    )

    // Create dynamic columns for each UNIQUE customField
    const dynamicColumns = uniqueCustomFields
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((field) => ({
        headerName: field.label || 'Unknown Field',
        field: `content.customFields.${field.headerField}`,
        valueGetter: (params) => {
          if (!params.data?.content) return 'N/A'

          try {
            const content =
              typeof params.data.content === 'string'
                ? JSON.parse(params.data.content)
                : params.data.content

            // Try to get value from selectedFieldValues first
            if (content.selectedFieldValues && content.selectedFieldValues[field.headerField]) {
              const value = content.selectedFieldValues[field.headerField]
              return typeof value === 'object' ? value.name || value.value || value.label : value
            }

            // Try to get value from customFields array as fallback
            if (content.customFields && Array.isArray(content.customFields)) {
              const customField = content.customFields.find(
                (f) => f.headerField === field.headerField
              )
              if (customField && customField.value) {
                return customField.value
              }
            }
          } catch (error) {
            console.error(`Error extracting ${field.label} value:`, error)
          }

          return 'N/A'
        },
        filter: true,
        flex: 1,
        minWidth: isAddressField(field.headerField) ? 250 : 120
      }))

    // Insert dynamic columns at the right position
    staticColumns.splice(insertIndex, 0, ...dynamicColumns)

    // Debug new columns
    console.log('New column definitions:')
    staticColumns.forEach((col, index) => {
      console.log(`${index}: ${col.headerName}`)
    })

    // Update the columnDefs with our new set of columns
    columnDefs.value = staticColumns
  } catch (error) {
    console.error('Error setting up dynamic columns:', error)
  }
}

// Function to navigate to media routes
const pushMediaRouter = (section: string) => {
  router.push(`/clients/reports/${section}`)
}

// Define column definitions with standard columns
const columnDefs = ref([
  {
    headerName: 'Sr.',
    valueGetter: (params: GridParams) => {
      return params.node.rowIndex + 1
    },
    filter: true,
    checkboxSelection: true,
    headerCheckboxSelection: true,
    headerCheckboxSelectionFilteredOnly: true, // Only select filtered items
    width: 80,
    minWidth: 80,
    maxWidth: 100,
    sortable: true
  },
  {
    field: 'primary_field',
    headerName: 'Report Name',
    valueGetter: (params) => {
      try {
        // Get the primary field value with multiple fallbacks
        if (params.data?.primary_selection_value) {
          return params.data.primary_selection_value
        } else if (params.data?.primary_field?.value) {
          return params.data.primary_field.value
        } else if (params.data?.content?.primaryField?.value) {
          return params.data.content.primaryField.value
        } else if (params.data?.branch_code) {
          return params.data.branch_code
        }
      } catch (error) {
        console.error('Error getting primary field value:', error)
      }
      return 'N/A'
    },
    cellRenderer: (params) => {
      // Create element for value display
      const element = document.createElement('div')

      try {
        // Try all possible locations for branch code/primary field value
        let fieldValue = null

        // First check direct fields including primary_selection_value
        if (params.data?.primary_selection_value) {
          fieldValue = params.data.primary_selection_value
        } else if (params.data?.primary_field?.value) {
          fieldValue = params.data.primary_field.value
        } else if (params.data?.branch_code) {
          fieldValue = params.data.branch_code
        }

        // Then check content object
        if (!fieldValue && params.data?.content) {
          let content = params.data.content

          // Parse if string
          if (typeof content === 'string') {
            try {
              content = JSON.parse(content)
            } catch (e) {
              console.error('Error parsing content:', e)
            }
          }

          // Look for primary field in the content
          if (content?.primaryField?.value) {
            fieldValue = content.primaryField.value
          } else if (content?.primaryIdentifierField && content?.selectedFieldValues) {
            const fieldName = content.primaryIdentifierField
            const fieldVal = content.selectedFieldValues[fieldName]

            if (fieldVal) {
              if (typeof fieldVal === 'object') {
                fieldValue = fieldVal.name || fieldVal.value || fieldVal.label
              } else {
                fieldValue = fieldVal
              }
            }
          }
        }

        // As a last resort, look for branch_id
        if (!fieldValue && params.data?.branch_id) {
          fieldValue = params.data.branch_id
        }

        // Display the value or a default
        element.innerText = fieldValue || 'Unknown'
      } catch (error) {
        console.error('Error getting primary field:', error)
        element.innerText = 'Unknown'
      }

      return element
    },
    filter: true,
    flex: 2,
    minWidth: 200
  },

  // Add Month column
  {
    headerName: 'Month',
    valueGetter: (params) => {
      try {
        // Use the same logic as Date of Visit to get the date
        // First priority: Check for date field directly in the report object
        if (params.data?.content?.date) {
          const date = new Date(params.data.content.date)
          if (!isNaN(date.getTime())) {
            return date.toLocaleString('default', { month: 'long' })
          }
        }

        // Second priority: Try to get date from selectedFieldValues
        if (params.data?.content?.selectedFieldValues) {
          // Look for date field in selectedFieldValues (common date field names)
          const fieldValues = params.data.content.selectedFieldValues
          for (const key of ['date', 'visit_date', 'audit_date', 'inspection_date']) {
            if (fieldValues[key]) {
              const dateValue = fieldValues[key].value || fieldValues[key]
              if (dateValue) {
                // If it's already a formatted date string, parse it
                if (typeof dateValue === 'string' && dateValue.includes('/')) {
                  const date = new Date(dateValue)
                  if (!isNaN(date.getTime())) {
                    return date.toLocaleString('default', { month: 'long' })
                  }
                }

                // Otherwise try to format it as date
                const date = new Date(dateValue)
                if (!isNaN(date.getTime())) {
                  return date.toLocaleString('default', { month: 'long' })
                }
              }
            }
          }
        }

        // Third priority: Check customFields array for date fields
        if (params.data?.content?.customFields && Array.isArray(params.data.content.customFields)) {
          const dateField = params.data.content.customFields.find(
            (f) =>
              f.fieldType === 'date' ||
              f.type === 'date' ||
              (f.label && f.label.toLowerCase().includes('date'))
          )

          if (dateField && dateField.value) {
            const date = new Date(dateField.value)
            if (!isNaN(date.getTime())) {
              return date.toLocaleString('default', { month: 'long' })
            }
          }
        }

        // Fallback: Try to get the date from created_at or updated_at field
        const dateStr = params.data?.created_at || params.data?.updated_at
        if (dateStr) {
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            return date.toLocaleString('default', { month: 'long' })
          }
        }
      } catch (error) {
        console.error('Error getting month from visit date:', error)
      }
      return 'N/A'
    },
    filter: true,
    width: 120,
    minWidth: 120
  },

  // Dynamic columns will be generated and added here - see setupDynamicColumns function

  {
    headerName: 'Overall Performance',
    valueGetter: (params) => {
      // Safety check for params.data
      if (!params?.data?.content) {
        return 'N/A'
      }

      try {
        // Parse content if it's a string
        const content =
          typeof params.data.content === 'string'
            ? JSON.parse(params.data.content)
            : params.data.content

        // Check if content has reports data with total scores
        if (content?.reports) {
          // Check for fatal error first
          const hasFatalError = content.reports.some((section: any) =>
            checkSectionFatalError(section)
          )
          if (hasFatalError) {
            return 'FATAL_ERROR'
          }

          // Calculate overall score from non-fatal sections only
          let totalAchieved = 0
          let totalApplicable = 0

          // Loop through all sections in the report to calculate the overall score
          content.reports.forEach((section) => {
            // Skip fatal error sections from calculation
            if (!isFatalErrorSection(section.heading || section.name)) {
              if (section.total_achieved_score !== undefined && section.total_applicable_score) {
                totalAchieved += parseFloat(section.total_achieved_score || 0)
                totalApplicable += parseFloat(section.total_applicable_score || 0)
              }
            }
          })

          // Calculate percentage
          if (totalApplicable > 0) {
            const percentage = (totalAchieved / totalApplicable) * 100
            return Math.round(percentage)
          }
        }
      } catch (error) {
        console.error('Error calculating performance:', error)
      }
      return 'N/A'
    },
    cellRenderer: (params) => {
      // Safety check
      if (!params?.value || params.value === 'N/A') {
        return 'N/A'
      }

      try {
        // Check for fatal error
        if (params.value === 'FATAL_ERROR') {
          const element = document.createElement('div')
          element.className =
            'px-2 py-3 rounded text-center font-bold text-sm flex items-center justify-center'
          element.style.backgroundColor = '#ef4444'
          element.style.color = '#ffffff'
          element.style.height = '40px'
          element.style.maxHeight = '50px'
          element.style.overflow = 'hidden'
          element.style.margin = '0'
          element.innerHTML = `<span style="line-height: 3">⚠️ FATAL ERROR</span>`
          return element
        }

        // Create a score display with color coding
        const score = parseFloat(params.value)
        const { color } = useColorsScore().getRangeBasedPerformance(score)
        const emoji = useColorsScore().getPerformanceEmoji(score)

        // Determine text color based on background color
        const textColor = useColorsScore().isLightColor(color) ? '#1f2937' : '#ffffff'

        const element = document.createElement('div')
        element.className =
          'px-2 py-3 rounded text-center font-medium text-sm flex items-center justify-center mt-4'
        element.style.backgroundColor = color
        element.style.color = textColor
        element.style.height = '40px'
        element.style.maxHeight = '50px'
        element.style.marginTop = '10px'
        element.style.overflow = 'hidden'
        element.style.margin = '0'
        element.innerHTML = `<span style="line-height: 3">${emoji} ${params.value}%</span>`
        return element
      } catch (error) {
        console.error('Error rendering performance score:', error)
        return 'Error'
      }
    },
    filter: true,
    flex: 1,
    minWidth: 150
  },
  {
    field: 'created_at',
    headerName: 'Created',
    width: 120,
    cellRenderer: (params) => {
      // Create a date display element
      const element = document.createElement('div')

      try {
        // Use current date as fallback
        const dateValue =
          params.data?.created_at ||
          params.data?.createdAt ||
          params.data?.updated_at ||
          new Date().toISOString()
        const date = new Date(dateValue)

        // Format the date in a simple, reliable way
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()

        element.innerText = `${day}/${month}/${year}`
      } catch (error) {
        // Fallback to today's date
        const today = new Date()
        const day = today.getDate().toString().padStart(2, '0')
        const month = (today.getMonth() + 1).toString().padStart(2, '0')
        const year = today.getFullYear()

        element.innerText = `${day}/${month}/${year}`
      }

      return element
    },
    filter: true
  },
  {
    headerName: 'Created By',
    valueGetter: (params) => {
      // Try to get the creator name with multiple fallbacks
      try {
        if (params.data?.creator?.name) {
          return params.data.creator.name
        } else if (params.data?.created_by_name) {
          return params.data.created_by_name
        } else if (params.data?.creator_name) {
          return params.data.creator_name
        }
      } catch (error) {
        console.error('Error getting creator name:', error)
      }
      return 'Unknown'
    },
    filter: true,
    flex: 1,
    minWidth: 120
  }
])

// Filtered reports
const filteredReports = computed(() => {
  if (!searchQuery.value.trim()) {
    return allReports.value
  }

  const query = searchQuery.value.toLowerCase()
  return allReports.value.filter((report) => {
    return (
      (report.template_name && report.template_name.toLowerCase().includes(query)) ||
      (report.branch_name && report.branch_name.toLowerCase().includes(query)) ||
      (report.status && report.status.toLowerCase().includes(query))
    )
  })
})

// Display reports - ensure only approved reports are shown for client users
// and filter by branch assignments for the user
const displayReports = computed(() => {
  const isClientUser = Auth().isClientUser()
  // If user has no branch assignments and is not an admin, return empty array
  if (assignedBranches.value.length === 0 && !Auth().isAdmin()) {
    console.log('No branch assignments found, not displaying any reports')
    return []
  }
  console.log('Is client user:', isClientUser)
  console.log('User role:', Auth().getUserRole())

  if (isClientUser) {
    console.log('Client user detected - filtering reports...')
    console.log('All reports total:', allReports.value.length)
    console.log('Filtered reports total:', filteredReports.value.length)

    // First filter for approved status
    const approvedReports = filteredReports.value.filter((report) => report.status === 'approved')
    console.log('Approved reports total:', approvedReports.length)

    // Then filter by branch assignments
    console.log('User branch assignments:', assignedBranches.value.length)

    // If no branch restrictions or user is admin, return all approved reports
    if (assignedBranches.value.length === 0 || Auth().isAdmin()) {
      console.log('No branch restrictions or user is admin, showing all approved reports')
      return approvedReports
    }

    // Extract branch identifiers using the approach from the dashboard
    const primaryFieldValues = extractBranchIdentifiers()
    console.log('Branch identifiers for filtering:', Array.from(primaryFieldValues))

    // Filter reports by branch identifiers using the dashboard's approach
    const branchFilteredReports = filterReportsByBranchAccess(approvedReports, primaryFieldValues)
    console.log('After branch filtering, displaying', branchFilteredReports.length, 'reports')

    return branchFilteredReports
  }

  return filteredReports.value
})

// Fetch branches with better typing
const fetchBranches = async () => {
  try {
    const clientId = Client().selected_client?.uuid
    if (!clientId) return

    // Add type assertion for Branches().getClientBranches
    const branches = await (Branches() as any).getClientBranches(clientId)
    branchOptions.value = [
      { id: null, name: 'All Branches' },
      ...branches.map((branch: any) => ({ id: branch.id, name: branch.name }))
    ]
  } catch (error) {
    console.error('Error fetching branches:', error)
  }
}

// Fetch reports
const fetchReports = async () => {
  loading.value = true
  errorMessage.value = null

  try {
    const userEmail = Auth().user?.email
    const userRole = Auth().getUserRole()
    console.log(`Fetching reports with user role: ${userRole} and email: ${userEmail}`)

    // Use the consolidated reports function
    const response = await Reports().getConsolidatedReports()
    console.log(`Fetched ${response.length} total reports`)

    // Apply filtering based on user role and branch assignments
    if (userRole === 'client_user') {
      console.log('Applying client_user filtering...')

      // First filter for approved status only
      const approvedReports = response.filter((report) => report.status === 'approved')
      console.log(`Filtered to ${approvedReports.length} approved reports for client_user`)

      // Then apply branch filtering if we have branch assignments
      if (assignedBranches.value.length > 0 && !Auth().isAdmin()) {
        console.log(
          `Applying branch filtering with ${assignedBranches.value.length} assigned branches`
        )

        // Extract branch identifiers
        const branchIdentifiers = extractBranchIdentifiers()
        console.log(`Using ${branchIdentifiers.size} branch identifiers for filtering`)

        // Filter reports by branch assignments
        const branchFilteredReports = filterReportsByBranchAccess(
          approvedReports,
          branchIdentifiers
        )
        console.log(`After branch filtering: ${branchFilteredReports.length} reports remain`)

        allReports.value = branchFilteredReports
      } else {
        console.log(
          'No branch filtering applied - either user is admin or no branch assignments found'
        )
        allReports.value = approvedReports
      }
    } else {
      // For admin users, show all reports
      console.log(`Admin user (${userRole}) - showing all ${response.length} reports`)
      allReports.value = response
    }

    // Check if we got any reports after filtering
    if (allReports.value.length === 0) {
      console.log('No reports available after filtering')
      if (assignedBranches.value.length > 0 && userRole === 'client_user') {
        errorMessage.value =
          'No reports found for your assigned branches. Please contact your administrator if this is incorrect.'
      } else {
        errorMessage.value = 'No reports found for this client'
      }
      safeGridApi.showNoRowsOverlay()
    } else {
      console.log(`Successfully loaded ${allReports.value.length} reports for display`)
      safeGridApi.hideOverlay()
    }
  } catch (error) {
    console.error('Error fetching reports:', error)
    errorMessage.value = 'Failed to load reports. Please try again.'
    Toast.error('Failed to load reports')

    safeGridApi.showNoRowsOverlay()
  } finally {
    loading.value = false
  }
}

// Export functions
const exportSelectedReportsToPDF = async () => {
  try {
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export')
      return
    }

    if (reportsToExport.length === 1) {
      await pdfExport.exportSingleReportToPDF(reportsToExport[0])
    } else {
      await pdfExport.exportMultipleReportsToPDF(reportsToExport)
    }

    showExportOptions.value = false

    // Programmatically deselect rows in the grid after export
    if (gridApi.value) {
      gridApi.value.deselectAll()
      selectedRows.value = []
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    Toast.error('Failed to export to PDF: ' + error.message)
  }
}

const exportSelectedReportsToExcel = async () => {
  try {
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export')
      return
    }

    await ExcelExport().exportReports(reportsToExport)
    showExportOptions.value = false

    // Programmatically deselect rows in the grid after export
    if (gridApi.value) {
      gridApi.value.deselectAll()
      selectedRows.value = []
    }
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    Toast.error('Failed to export to Excel: ' + error.message)
  }
}

const exportSelectedReportsImages = async () => {
  try {
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export images from')
      return
    }

    if (reportsToExport.length === 1) {
      await mediaExport.exportImages(reportsToExport[0])
    } else {
      await mediaExport.exportMultipleImages(reportsToExport)
    }

    showExportOptions.value = false

    // Programmatically deselect rows in the grid after export
    if (gridApi.value) {
      gridApi.value.deselectAll()
      selectedRows.value = []
    }
  } catch (error) {
    console.error('Error exporting images:', error)
    Toast.error('Failed to export images: ' + error.message)
  }
}

const exportSelectedReportsVideos = async () => {
  try {
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export videos from')
      return
    }

    if (reportsToExport.length === 1) {
      await mediaExport.exportVideos(reportsToExport[0])
    } else {
      await mediaExport.exportMultipleVideos(reportsToExport)
    }

    showExportOptions.value = false

    // Programmatically deselect rows in the grid after export
    if (gridApi.value) {
      gridApi.value.deselectAll()
      selectedRows.value = []
    }
  } catch (error) {
    console.error('Error exporting videos:', error)
    Toast.error('Failed to export videos: ' + error.message)
  }
}

// Add error handling function for unexpected errors
const handleGridError = (error: any, action: string) => {
  console.error(`AG Grid error during ${action}:`, error)
  Toast.error(`An error occurred while ${action}. Please try refreshing the page.`)

  // Reset loading state if needed
  if (loading.value) {
    loading.value = false
  }
}

// Add refresh handler to safely refresh grid after data changes
const refreshGrid = () => {
  if (!gridApi.value) return

  setTimeout(() => {
    try {
      gridApi.value.refreshCells()
    } catch (err) {
      handleGridError(err, 'refreshing grid')
    }
  }, 0)
}

// Update watch to use refreshGrid
watch(
  () => client.value,
  () => {
    fetchBranches()
    fetchReports()
      .then(() => {
        refreshGrid()
      })
      .catch((err) => {
        handleGridError(err, 'refreshing data')
      })
  }
)

// Add a watch for filtered reports to ensure grid updates safely
watch(
  () => filteredReports.value,
  () => {
    refreshGrid()
  }
)
// Watch for changes in report data to update dynamic columns
watch(
  allReports,
  (newReports) => {
    if (newReports && newReports.length > 0) {
      console.log('Reports loaded, setting up dynamic columns')
      setupDynamicColumns()
    }
  },
  { immediate: true, deep: true }
)

// Update lifecycle hook to be more robust
onMounted(async () => {
  await Ranges().fetch()
  try {
    // Set initial state
    console.log('Overall MIS Sheet component mounted')

    // Load user data if needed
    const userEmail = Auth().user?.email
    const userRole = Auth().getUserRole()

    console.log('Current user email:', userEmail)
    console.log('Current user role:', userRole)

    if (!userEmail) {
      console.error('No user email available')
      errorMessage.value = 'User authentication required'
      return
    }

    // Get current client info
    const clientId = Client().selected_client?.uuid
    console.log('Fetching Overall MIS Sheet for client:', clientId)

    // First load branch assignments
    console.log('Loading branch assignments for user:', userEmail)
    await loadAssignedBranches(userEmail)

    // Then load branches for dropdowns
    await fetchBranches()

    // Grid API might not be ready yet if this runs before onGridReady
    if (!gridApi.value) {
      console.log('Grid not ready on mount, data will be loaded when grid is ready')
    }
  } catch (err) {
    console.error('Error during component initialization:', err)
    errorMessage.value = 'Error initializing component: ' + (err.message || 'Unknown error')
  }
})

// Computed property to check if we have reports to consolidate
const hasFilteredReports = computed(() => {
  return displayReports.value.length > 0
})

// Function to generate consolidated reports
const generateConsolidatedReports = () => {
  if (!hasFilteredReports.value) {
    Toast.error('No reports available to consolidate. Please adjust your filters.')
    return
  }

  // Show loading indicator
  loading.value = true

  try {
    // Get the currently displayed/filtered reports from the grid API
    let reportsToProcess = []

    if (selectedRows.value.length > 0) {
      // If there are selected rows, use those (Selected via checkboxes)
      reportsToProcess = selectedRows.value
      console.log(`Using ${reportsToProcess.length} selected reports for combined view`)
      Toast.info(`Generating report for ${selectedRows.value.length} selected reports`)
    } else {
      // If no specific selections, use the currently displayed/filtered reports
      reportsToProcess = displayReports.value
      console.log(`Using all ${reportsToProcess.length} filtered reports for combined view`)
    }

    console.log('Reports being processed:', reportsToProcess.length)

    // Extract AG Grid column definitions to create dynamic consolidation fields
    const activeColumns = columnDefs.value.filter((col) => {
      // Skip technical columns like checkboxes and media buttons
      if (col?.headerName === 'Sr.') return false
      if (
        col?.headerName === 'Video' ||
        col?.headerName === 'Picture' ||
        col?.headerName === 'Audio'
      )
        return false
      if (col?.headerName && typeof col.headerName === 'string') return true
      return false
    })

    // Set up dynamic table headers - starting with the key fields
    consolidatedTableHeaders.value = [{ key: 'reportName', display: 'Report Name' }]

    // Add all other fields from columns (including Overall Performance)
    activeColumns.forEach((col) => {
      if (
        col?.headerName &&
        col.headerName !== 'Report Name' &&
        col.headerName !== 'Sr.' &&
        col.headerName !== 'Created' &&
        col.headerName !== 'Date of Visit' &&
        col.headerName !== 'Time of Visit'
      ) {
        consolidatedTableHeaders.value.push({
          key: col.headerName.toLowerCase().replace(/\s+/g, '_'),
          display: col.headerName
        })
      }
    })

    // Add Date of Visit and Time of Visit after all other dynamic columns
    consolidatedTableHeaders.value.push(
      { key: 'dateOfVisit', display: 'Date of Visit' },
      { key: 'timeOfVisit', display: 'Time of Visit' }
    )

    // Add custom fields that might exist in the reports
    const consolidatedResults = reportsToProcess.map((report: any) => {
      // Base report object with standard fields
      const result: Record<string, any> = {
        id: report.id,
        reportName: report.primary_selection_value || getReportName(report),
        dateOfVisit: getReportDateOfVisit(report),
        timeOfVisit: getReportTimeOfVisit(report)
      }

      // Extract values from each column definition using their value getters
      activeColumns.forEach((col) => {
        if (col?.headerName) {
          const key = col.headerName.toLowerCase().replace(/\s+/g, '_')

          // Try to extract value using valueGetter if available, otherwise use direct field access
          if (col.valueGetter && typeof col.valueGetter === 'function') {
            try {
              result[key] = col.valueGetter({ data: report, node: { rowIndex: 0 } })
            } catch (e) {
              // Fall back to direct field access if provided
              result[key] = report[col.field || ''] || 'N/A'
            }
          } else if (col.field) {
            result[key] = report[col.field] || 'N/A'
          } else {
            result[key] = 'N/A'
          }
        }
      })

      // Extract section and question data
      if (report.content && Object.keys(report.content).length > 0) {
        const content =
          typeof report.content === 'string' ? JSON.parse(report.content) : report.content
        result._rawContent = content
      } else {
        console.warn(`Report ${report.id} is missing content. Skipping rawContent setup.`)
        result._rawContent = null
      }

      return result
    })

    // Generate section and question structure
    generateSectionAndQuestionStructure(reportsToProcess)

    // Update consolidated data
    consolidatedData.value = consolidatedResults

    // Calculate overall stats
    const totalReports = reportsToProcess.length
    const overallTotalScore = reportsToProcess.reduce((sum, report: any) => {
      // Check if the report has a fatal error
      const hasFatalError = checkReportHasFatalError(report)
      // If fatal error, treat score as 0, otherwise use the actual score
      const reportScore = hasFatalError ? 0 : Number(report.total_score) || 0
      return sum + reportScore
    }, 0)
    const overallAverageScore = totalReports ? Math.round(overallTotalScore / totalReports) : 0

    // Format date range for display
    let dateRangeText = 'All Time'
    if (dateRange.value.from && dateRange.value.to) {
      const fromDate = formatDate(dateRange.value.from)
      const toDate = formatDate(dateRange.value.to)
      dateRangeText = `${fromDate} to ${toDate}`
    } else if (dateRange.value.from) {
      dateRangeText = `From ${formatDate(dateRange.value.from)}`
    } else if (dateRange.value.to) {
      dateRangeText = `Until ${formatDate(dateRange.value.to)}`
    }

    // Update consolidated stats
    consolidatedStats.value = {
      totalReports,
      averageScore: overallAverageScore,
      dateRange: dateRangeText
    }

    // Show consolidated results section
    showConsolidatedResults.value = true

    // Scroll to results section
    setTimeout(() => {
      const resultsSection = document.querySelector('.consolidated-results')
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  } catch (error: any) {
    console.error('Error generating consolidated reports:', error)
    Toast.error(
      'Failed to generate consolidated reports' + (error.message ? ': ' + error.message : '')
    )
  } finally {
    loading.value = false
  }
}

// Helper function to extract sections and questions structure from reports
const generateSectionAndQuestionStructure = (reports: any[]) => {
  try {
    const sectionsMap = new Map()
    const globalQuestionTracker = new Map() // Track questions globally to avoid duplicates

    // Helper function to normalize section names for comparison
    const normalizeSectionName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/behaviour/g, 'behavior') // Normalize spelling differences
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }

    // Process all reports to extract unique sections and questions
    reports.forEach((report: any) => {
      const content =
        typeof report.content === 'string' ? JSON.parse(report.content) : report.content

      if (content?.reports && Array.isArray(content.reports)) {
        content.reports.forEach((section: any, sectionIndex: number) => {
          const originalHeading = section.heading || `Section ${sectionIndex + 1}`
          const normalizedHeading = normalizeSectionName(originalHeading)

          // Check if we already have a section with this normalized name
          let existingSectionId = null
          for (const [existingId, existingSection] of sectionsMap.entries()) {
            if (normalizeSectionName(existingId) === normalizedHeading) {
              existingSectionId = existingId
              break
            }
          }

          // Use existing section ID or create new one
          const sectionId = existingSectionId || originalHeading

          if (!sectionsMap.has(sectionId)) {
            // Find the section number by counting existing sections + 1
            const sectionNumber = sectionsMap.size + 1
            sectionsMap.set(sectionId, {
              id: sectionId, // Keep the original heading as ID
              name: `Section ${sectionNumber} - ${originalHeading}`, // Display name with number
              questions: new Map(),
              normalizedName: normalizedHeading
            })
          }

          const sectionData = sectionsMap.get(sectionId)

          // Extract questions for this section
          if (section.data && Array.isArray(section.data)) {
            section.data.forEach((question: any, questionIndex: number) => {
              // Create unique identifier for each question/sub-question combination
              let questionId: string
              let questionTitle: string
              let globalQuestionKey: string

              if (question.sub_question && question.sub_question.trim() !== '') {
                // For sub-questions, use a combination of main question and sub-question
                const mainQuestion = question.question || `Question ${questionIndex + 1}`
                questionId = `${mainQuestion}::${question.sub_question}`
                questionTitle = question.sub_question
                globalQuestionKey = `${normalizedHeading}::${questionId}` // Use normalized heading for global tracking
              } else {
                // For main questions without sub-questions
                questionId = question.question || `Question ${questionIndex + 1}`
                questionTitle = question.question || `Question ${questionIndex + 1}`
                globalQuestionKey = `${normalizedHeading}::${questionId}` // Use normalized heading for global tracking
              }

              // Check if this exact question already exists globally (using normalized section name)
              if (!globalQuestionTracker.has(globalQuestionKey)) {
                globalQuestionTracker.set(globalQuestionKey, true)

                // Also check if it exists in this section
                if (!sectionData.questions.has(questionId)) {
                  sectionData.questions.set(questionId, {
                    id: questionId,
                    number: `${Array.from(sectionsMap.keys()).indexOf(sectionId) + 1}.${
                      sectionData.questions.size + 1
                    }`,
                    title: questionTitle,
                    mainQuestion: question.question || '',
                    subQuestion: question.sub_question || ''
                  })
                }
              }
            })
          }
        })
      }
    })

    // Convert the Map structure to arrays for Vue rendering
    consolidatedSections.value = Array.from(sectionsMap.values()).map((section) => {
      return {
        id: section.id,
        name: section.name,
        questions: Array.from(section.questions.values())
      }
    })

    console.log(
      'Generated sections (after deduplication):',
      consolidatedSections.value.map((s) => ({
        id: s.id,
        name: s.name,
        questionCount: s.questions.length,
        questions: s.questions.map((q) => q.title).slice(0, 3) // Show first 3 questions for debugging
      }))
    )
  } catch (error) {
    console.error('Error generating section and question structure:', error)
    consolidatedSections.value = []
  }
}

// Helper function to get question values for a report
const getQuestionValue = (
  report: any,
  sectionId: string,
  questionId: string,
  valueType: 'applicable' | 'achieved'
): string => {
  try {
    if (!report._rawContent || !report._rawContent.reports) {
      console.warn(`No raw content or reports found for report ${report.id}`)
      return '-'
    }

    console.log(`\n=== SEARCHING FOR SCORES ===`)
    console.log(`Report ID: ${report.id}`)
    console.log(`Looking for section: "${sectionId}"`)
    console.log(`Looking for question: "${questionId}"`)
    console.log(`Value type: ${valueType}`)

    // Find the section - use exact heading match
    const section = report._rawContent.reports.find((s: any) => {
      console.log(`Checking section: "${s.heading}"`)
      return s.heading === sectionId
    })

    if (!section || !section.data) {
      console.warn(`Section not found: "${sectionId}"`)
      console.warn(
        `Available sections:`,
        report._rawContent.reports.map((s: any) => s.heading)
      )
      return '-'
    }

    console.log(`✓ Found section: "${section.heading}" with ${section.data.length} questions`)
    console.log('Available questions:', section.data)

    // Find the question - handle both main questions and sub-questions
    let question: any = null

    if (questionId.includes('::')) {
      // This is a sub-question identifier (mainQuestion::subQuestion)
      const [mainQuestionText, subQuestionText] = questionId.split('::')
      console.log(`Looking for sub-question: main="${mainQuestionText}", sub="${subQuestionText}"`)

      question = section.data.find((q: any) => {
        // For sub-questions, we need to be more flexible with matching
        // since many questions have empty main question fields
        const subMatch = q.sub_question === subQuestionText

        // If the main question is empty, just match by sub-question
        if (!q.question || q.question.trim() === '') {
          console.log(
            `  Checking: "${q.question}" / "${q.sub_question}" - empty main, sub:${subMatch}`
          )
          return subMatch
        }

        // If main question exists, match both
        const mainMatch = q.question === mainQuestionText
        console.log(
          `  Checking: "${q.question}" / "${q.sub_question}" - main:${mainMatch}, sub:${subMatch}`
        )
        return mainMatch && subMatch
      })
    } else {
      // This is a main question identifier
      console.log(`Looking for main question: "${questionId}"`)
      question = section.data.find((q: any) => {
        // For main questions, match by question text and ensure no sub-question exists
        const questionMatch = q.question === questionId
        const noSubQuestion = !q.sub_question || q.sub_question.trim() === ''
        console.log(`  Checking: "${q.question}" - match:${questionMatch}, noSub:${noSubQuestion}`)
        return questionMatch && noSubQuestion
      })
    }

    if (!question) {
      console.warn(`❌ Question not found: "${questionId}" in section: "${sectionId}"`)
      console.warn(
        `Available questions:`,
        section.data.map((q: any) => ({
          question: q.question,
          sub_question: q.sub_question,
          applicable_score: q.applicable_score,
          achieved_score: q.achieved_score
        }))
      )
      return '-'
    }

    console.log(`✓ Found question:`, {
      question: question.question,
      sub_question: question.sub_question,
      applicable_score: question.applicable_score,
      achieved_score: question.achieved_score
    })

    // Return the requested value
    if (valueType === 'applicable') {
      const value =
        question.applicable_score !== undefined ? question.applicable_score.toString() : '-'
      console.log(`✓ Returning applicable score: ${value}`)
      return value
    } else {
      const value = question.achieved_score !== undefined ? question.achieved_score.toString() : '-'
      console.log(`✓ Returning achieved score: ${value}`)
      return value
    }
  } catch (error) {
    console.error(`Error getting ${valueType} value for question:`, error)
    return '-'
  }
}

// Helper function to calculate question score percentage
const getQuestionScorePercentage = (report: any, sectionId: string, questionId: string): number => {
  try {
    if (!report._rawContent || !report._rawContent.reports) {
      return 0
    }

    // Find the section
    const section = report._rawContent.reports.find(
      (s: any) => s.heading === sectionId || s.heading.includes(sectionId)
    )

    if (!section || !section.data) {
      return 0
    }

    // Find the question - handle both main questions and sub-questions
    let question: any = null

    if (questionId.includes('::')) {
      // This is a sub-question identifier (mainQuestion::subQuestion)
      const [mainQuestionText, subQuestionText] = questionId.split('::')
      question = section.data.find((q: any) => {
        const mainMatch = q.question === mainQuestionText || q.question?.includes(mainQuestionText)
        const subMatch =
          q.sub_question === subQuestionText || q.sub_question?.includes(subQuestionText)
        return mainMatch && subMatch
      })
    } else {
      // This is a main question identifier
      question = section.data.find((q: any) => {
        // For main questions, match by question text and ensure no sub-question exists
        const questionMatch = q.question === questionId || q.question?.includes(questionId)
        const noSubQuestion = !q.sub_question || q.sub_question.trim() === ''
        return questionMatch && noSubQuestion
      })
    }

    if (!question) {
      return 0
    }

    // Calculate percentage
    const applicable = parseFloat(question.applicable_score || '0')
    const achieved = parseFloat(question.achieved_score || '0')

    if (applicable <= 0) {
      return 0
    }

    return (achieved / applicable) * 100
  } catch (error) {
    console.error('Error calculating question score percentage:', error)
    return 0
  }
}

// Add helper functions for section totals
// Helper function to get section total value
const getSectionTotalValue = (
  report: any,
  sectionId: string,
  valueType: 'applicable' | 'achieved'
): string => {
  try {
    if (!report._rawContent || !report._rawContent.reports) {
      return '0'
    }

    // Find the section
    const section = report._rawContent.reports.find(
      (s: any) => s.heading === sectionId || s.heading.includes(sectionId)
    )

    if (!section) {
      return '0'
    }

    // Return the requested value
    if (valueType === 'applicable') {
      return section.total_applicable_score !== undefined
        ? section.total_applicable_score.toString()
        : '0'
    } else {
      return section.total_achieved_score !== undefined
        ? section.total_achieved_score.toString()
        : '0'
    }
  } catch (error) {
    console.error(`Error getting section ${valueType} total:`, error)
    return '0'
  }
}

// Helper function to calculate section score percentage
const getSectionScorePercentage = (report: any, sectionId: string): number => {
  try {
    if (!report._rawContent || !report._rawContent.reports) {
      return 0
    }

    // Find the section
    const section = report._rawContent.reports.find(
      (s: any) => s.heading === sectionId || s.heading.includes(sectionId)
    )

    if (!section) {
      return 0
    }

    // Calculate percentage
    const applicable = parseFloat(section.total_applicable_score || '0')
    const achieved = parseFloat(section.total_achieved_score || '0')

    if (applicable <= 0) {
      return 0
    }

    return (achieved / applicable) * 100
  } catch (error) {
    console.error('Error calculating section score percentage:', error)
    return 0
  }
}

// Function to export consolidated results
const exportConsolidatedResults = async () => {
  // Show color customization dialog
  showColorCustomizationDialog.value = true
}

// Add new function to perform the actual export after color selection
const performExcelExport = async () => {
  try {
    // Create workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Overall MIS Sheet')

    // Get all report information headers
    const dynamicHeaders = consolidatedTableHeaders.value

    // Add main section headers row
    const mainHeaderRow = worksheet.addRow([])

    // Add report info header spanning multiple columns
    mainHeaderRow.getCell(1).value = 'Additional Information'
    // Merge report info cells based on number of headers
    if (dynamicHeaders.length > 1) {
      worksheet.mergeCells(mainHeaderRow.number, 1, mainHeaderRow.number, dynamicHeaders.length)
    }

    // Track column index after report info columns
    let colIndex = dynamicHeaders.length + 1

    // Add section headers
    consolidatedSections.value.forEach((section) => {
      const startCol = colIndex
      // Calculate span for section (questions * 2 + 3 for section totals)
      const sectionSpan = section.questions.length * 2 + 3

      // Add section name
      mainHeaderRow.getCell(colIndex).value = section.name

      // Update column index for next section
      colIndex += sectionSpan

      // Merge section cells
      if (sectionSpan > 1) {
        worksheet.mergeCells(mainHeaderRow.number, startCol, mainHeaderRow.number, colIndex - 1)
      }
    })

    // Add total score header
    mainHeaderRow.getCell(colIndex).value = 'Total Score'
    // Merge total score cells (3 columns)
    worksheet.mergeCells(mainHeaderRow.number, colIndex, mainHeaderRow.number, colIndex + 2)

    // Style the main header row with custom colors
    for (let i = 1; i <= colIndex + 2; i++) {
      const cell = mainHeaderRow.getCell(i)
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }

      if (i <= dynamicHeaders.length) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.reportInfoHeader }
        }
      } else if (i >= colIndex) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.totalHeader }
        }
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.sectionHeader }
        }
      }

      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }

    // Add question headers row
    const questionRow = worksheet.addRow([])

    // First add original headers
    dynamicHeaders.forEach((header, index) => {
      questionRow.getCell(index + 1).value = header.display
    })

    // Reset column index
    colIndex = dynamicHeaders.length + 1

    // Then add question headers
    consolidatedSections.value.forEach((section) => {
      section.questions.forEach((question) => {
        const questionTitle = question.number + ' ' + question.title
        questionRow.getCell(colIndex).value = questionTitle

        // Merge question cells (spans 2 columns for App and Ach)
        worksheet.mergeCells(questionRow.number, colIndex, questionRow.number, colIndex + 1)

        colIndex += 2
      })

      // Add section total header (spans 3 columns)
      questionRow.getCell(colIndex).value = 'Section Total'
      worksheet.mergeCells(questionRow.number, colIndex, questionRow.number, colIndex + 2)
      colIndex += 3
    })

    // Add report total headers
    questionRow.getCell(colIndex).value = 'Report Total'
    worksheet.mergeCells(questionRow.number, colIndex, questionRow.number, colIndex + 2)

    // Style the question headers
    for (let i = 1; i <= colIndex + 2; i++) {
      const cell = questionRow.getCell(i)
      cell.font = { bold: true }

      if (i <= dynamicHeaders.length) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.reportInfoBg }
        }
      } else if (i >= colIndex) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.totalBg }
        }
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.sectionBg }
        }
      }

      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }

    // Add App/Ach headers
    const subheaderRow = worksheet.addRow([])

    // First add blank cells for original headers
    for (let i = 1; i <= dynamicHeaders.length; i++) {
      subheaderRow.getCell(i).value = ''
    }

    // Reset column index
    colIndex = dynamicHeaders.length + 1

    // Then add App/Ach headers for questions
    consolidatedSections.value.forEach((section) => {
      section.questions.forEach(() => {
        subheaderRow.getCell(colIndex).value = 'App'
        subheaderRow.getCell(colIndex + 1).value = 'Ach'
        colIndex += 2
      })

      // Add section total subheaders
      subheaderRow.getCell(colIndex).value = 'App Total'
      subheaderRow.getCell(colIndex + 1).value = 'Ach Total'
      subheaderRow.getCell(colIndex + 2).value = '% Total'
      colIndex += 3
    })

    // Add report total subheaders
    subheaderRow.getCell(colIndex).value = 'App Total'
    subheaderRow.getCell(colIndex + 1).value = 'Ach Total'
    subheaderRow.getCell(colIndex + 2).value = '% Total'

    // Style the subheader row
    for (let i = 1; i <= colIndex + 2; i++) {
      const cell = subheaderRow.getCell(i)
      cell.font = { bold: true }

      if (i <= dynamicHeaders.length) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.reportInfoBg }
        }
      } else if (i >= colIndex) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.totalBg }
        }
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.sectionBg }
        }
      }

      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }

    // Add data rows
    consolidatedData.value.forEach((item) => {
      const dataRow = worksheet.addRow([])

      // First add original columns data
      dynamicHeaders.forEach((header, index) => {
        let cellValue = item[header.key] || ''

        // Special formatting for percentage fields
        if (header.key === 'averageScore' || header.key === 'overall_performance') {
          if (typeof cellValue === 'number') {
            dataRow.getCell(index + 1).numFmt = '0.00"%"'
          } else if (typeof cellValue === 'string' && cellValue.endsWith('%')) {
            cellValue = parseFloat(cellValue.replace('%', ''))
            dataRow.getCell(index + 1).numFmt = '0.00"%"'
          }
        }

        dataRow.getCell(index + 1).value = cellValue
      })

      // Reset column index for section/question data
      colIndex = dynamicHeaders.length + 1

      // Then add section/question data
      consolidatedSections.value.forEach((section) => {
        let sectionAppTotal = 0
        let sectionAchTotal = 0

        section.questions.forEach((question) => {
          // App score
          const appValue = getQuestionValue(item, section.id, question.id, 'applicable')
          dataRow.getCell(colIndex).value = appValue
          sectionAppTotal += parseFloat(appValue || '0')
          colIndex++

          // Ach score
          const achValue = getQuestionValue(item, section.id, question.id, 'achieved')
          dataRow.getCell(colIndex).value = achValue
          sectionAchTotal += parseFloat(achValue || '0')
          colIndex++
        })

        // Add section totals
        const sectionAppTotalValue = getSectionTotalValue(item, section.id, 'applicable')
        const sectionAchTotalValue = getSectionTotalValue(item, section.id, 'achieved')
        const sectionPercentage = getSectionScorePercentage(item, section.id)

        dataRow.getCell(colIndex).value = sectionAppTotalValue
        colIndex++
        dataRow.getCell(colIndex).value = sectionAchTotalValue
        colIndex++

        // Percentage with formatting
        dataRow.getCell(colIndex).value = sectionPercentage
        dataRow.getCell(colIndex).numFmt = '0.00"%"'

        // Add conditional formatting for score
        if (sectionPercentage >= 80) {
          dataRow.getCell(colIndex).font = { color: { argb: excelColorScheme.value.highScore } }
        } else if (sectionPercentage >= 60) {
          dataRow.getCell(colIndex).font = { color: { argb: excelColorScheme.value.mediumScore } }
        } else {
          dataRow.getCell(colIndex).font = { color: { argb: excelColorScheme.value.lowScore } }
        }

        colIndex++
      })

      // Add report total values
      const reportAppTotal = calculateReportRowTotal(item, 'applicable')
      const reportAchTotal = calculateReportRowTotal(item, 'achieved')
      const reportPercentage = calculateReportRowPercentage(item)

      dataRow.getCell(colIndex).value = reportAppTotal
      colIndex++
      dataRow.getCell(colIndex).value = reportAchTotal
      colIndex++

      // Percentage with formatting
      dataRow.getCell(colIndex).value = reportPercentage
      dataRow.getCell(colIndex).numFmt = '0.00"%"'

      // Add conditional formatting for score
      if (reportPercentage >= 80) {
        dataRow.getCell(colIndex).font = { color: { argb: excelColorScheme.value.highScore } }
      } else if (reportPercentage >= 60) {
        dataRow.getCell(colIndex).font = { color: { argb: excelColorScheme.value.mediumScore } }
      } else {
        dataRow.getCell(colIndex).font = { color: { argb: excelColorScheme.value.lowScore } }
      }

      // Style the data cells
      for (let i = 1; i <= colIndex; i++) {
        const cell = dataRow.getCell(i)

        // Align cells
        if (i <= dynamicHeaders.length) {
          cell.alignment = { horizontal: 'left' }
        } else {
          cell.alignment = { horizontal: 'center' }
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    })

    // Auto-size columns based on content
    worksheet.columns.forEach((column: any) => {
      if (column) {
        let maxLength = 10
        column.eachCell({ includeEmpty: true }, (cell: any) => {
          if (cell && cell.value) {
            const length = cell.value.toString().length
            if (length > maxLength) {
              maxLength = Math.min(length, 100) // Limit to 100 chars
            }
          }
        })
        column.width = Math.min(Math.max(maxLength + 2, 12), 30) // Limit column width
      }
    })

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    FileSaver.saveAs(blob, `Overall_MIS_Sheet_${new Date().toISOString().split('T')[0]}.xlsx`)

    // Hide dialog and show success message
    showColorCustomizationDialog.value = false
    Toast.success('Overall MIS Sheet exported successfully')
  } catch (error: any) {
    console.error('Error exporting combined results:', error)
    Toast.error('Failed to export combined results: ' + (error.message || 'Unknown error'))
  }
}

// Add color presets function
const applyPresetColors = (preset: string) => {
  switch (preset) {
    case 'default':
      excelColorScheme.value = {
        reportInfoHeader: 'C6E6C1', // Green for Report Info header
        sectionHeader: 'C1D5E5', // Blue for Section headers
        totalHeader: 'E5C1E5', // Purple for Total header
        reportInfoBg: 'F0F8EF', // Light green for Report Info cells
        sectionBg: 'EFF4F9', // Light blue for Section cells
        totalBg: 'F5EDF5', // Light purple for Total cells
        highScore: '006100', // Dark green for high scores
        mediumScore: 'CC7A00', // Orange for medium scores
        lowScore: 'CC0000' // Red for low scores
      }
      break
    case 'professional':
      excelColorScheme.value = {
        reportInfoHeader: '1F4E79', // Dark blue for Report Info header
        sectionHeader: '2F5597', // Medium blue for Section headers
        totalHeader: '366092', // Blue for Total header
        reportInfoBg: 'D9E2F3', // Light blue for Report Info cells
        sectionBg: 'E8EFF9', // Very light blue for Section cells
        totalBg: 'D9E2F3', // Light blue for Total cells
        highScore: '375623', // Dark green for high scores
        mediumScore: '843C0C', // Brown for medium scores
        lowScore: '843737' // Dark red for low scores
      }
      break
    case 'vibrant':
      excelColorScheme.value = {
        reportInfoHeader: '7030A0', // Purple for Report Info header
        sectionHeader: '00B0F0', // Bright blue for Section headers
        totalHeader: 'FFC000', // Gold for Total header
        reportInfoBg: 'E6D0F0', // Light purple for Report Info cells
        sectionBg: 'CCE8F9', // Light blue for Section cells
        totalBg: 'FFF0C1', // Light gold for Total cells
        highScore: '70AD47', // Bright green for high scores
        mediumScore: 'ED7D31', // Orange for medium scores
        lowScore: 'FF0000' // Bright red for low scores
      }
      break
    case 'monochrome':
      excelColorScheme.value = {
        reportInfoHeader: '404040', // Dark gray for Report Info header
        sectionHeader: '595959', // Medium gray for Section headers
        totalHeader: '262626', // Darker gray for Total header
        reportInfoBg: 'F2F2F2', // Light gray for Report Info cells
        sectionBg: 'E6E6E6', // Slightly darker gray for Section cells
        totalBg: 'D9D9D9', // Medium light gray for Total cells
        highScore: '303030', // Dark gray for high scores
        mediumScore: '595959', // Medium gray for medium scores
        lowScore: '7F7F7F' // Light gray for low scores
      }
      break
    case 'dark':
      excelColorScheme.value = {
        reportInfoHeader: '134F5C', // Teal for Report Info header
        sectionHeader: '0F243E', // Navy for Section headers
        totalHeader: '4A266A', // Dark purple for Total header
        reportInfoBg: 'D5E8EB', // Light teal for Report Info cells
        sectionBg: 'D6E1EB', // Light navy for Section cells
        totalBg: 'E6D9EF', // Light purple for Total cells
        highScore: '00802B', // Dark green for high scores
        mediumScore: 'AC7339', // Bronze for medium scores
        lowScore: '8B0000' // Dark red for low scores
      }
      break
  }
}

// Helper function to get report name
const getReportName = (report: any): string => {
  if (report?.primary_field?.value) {
    return report.primary_field.value
  }

  if (report?.content) {
    const content = typeof report.content === 'string' ? JSON.parse(report.content) : report.content

    if (content?.primaryField?.value) {
      return content.primaryField.value
    }

    if (content?.primaryIdentifierField && content?.selectedFieldValues) {
      const fieldName = content.primaryIdentifierField
      const fieldVal = content.selectedFieldValues[fieldName]

      if (fieldVal) {
        if (typeof fieldVal === 'object') {
          return fieldVal.name || fieldVal.value || fieldVal.label || 'Unknown'
        } else {
          return String(fieldVal)
        }
      }
    }
  }

  if (report?.branch_code) {
    return report.branch_code
  }

  if (report?.branch_id) {
    return `Branch ${report.branch_id}`
  }

  if (report?.template_name) {
    return report.template_name
  }

  return `Report ${report.id || 'Unknown'}`
}

// Helper function to format date
const formatDate = (date: Date): string => {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Helper function to get color class based on score
const getScoreColorClass = (score: number): string => {
  if (score >= 80) return 'text-green-600 font-medium'
  if (score >= 60) return 'text-yellow-600 font-medium'
  return 'text-red-600 font-medium'
}

// Add helper function to determine if a field is an address field
const isAddressField = (fieldName: string): boolean => {
  const addressKeywords = ['address', 'location', 'branch', 'street', 'city', 'postal']
  return addressKeywords.some((keyword) => fieldName.toLowerCase().includes(keyword))
}

// Helper function to calculate total applicable scores for all reports in a section
const calculateSectionTotalAllReports = (
  sectionId: string,
  valueType: 'applicable' | 'achieved'
): string => {
  try {
    let total = 0

    consolidatedData.value.forEach((report) => {
      const sectionValue = parseInt(getSectionTotalValue(report, sectionId, valueType)) || 0
      total += sectionValue
    })

    return total.toString()
  } catch (error) {
    console.error(`Error calculating total ${valueType} for section:`, error)
    return '0'
  }
}

// Helper function to calculate overall percentage for a section across all reports
const calculateSectionOverallPercentage = (sectionId: string): number => {
  try {
    const totalApplicable = parseInt(calculateSectionTotalAllReports(sectionId, 'applicable')) || 0
    const totalAchieved = parseInt(calculateSectionTotalAllReports(sectionId, 'achieved')) || 0

    if (totalApplicable <= 0) {
      return 0
    }

    return (totalAchieved / totalApplicable) * 100
  } catch (error) {
    console.error('Error calculating overall section percentage:', error)
    return 0
  }
}

// Helper function to calculate grand total across all sections (applicable/achieved)
const calculateGrandTotalAllSections = (valueType: 'applicable' | 'achieved'): string => {
  try {
    let grandTotal = 0

    consolidatedSections.value.forEach((section) => {
      const sectionTotal = parseInt(calculateSectionTotalAllReports(section.id, valueType)) || 0
      grandTotal += sectionTotal
    })

    return grandTotal.toString()
  } catch (error) {
    console.error(`Error calculating grand total ${valueType}:`, error)
    return '0'
  }
}

// Helper function to calculate grand total percentage across all sections
const calculateGrandTotalPercentage = (): number => {
  try {
    const totalApplicable = parseInt(calculateGrandTotalAllSections('applicable')) || 0
    const totalAchieved = parseInt(calculateGrandTotalAllSections('achieved')) || 0

    if (totalApplicable <= 0) {
      return 0
    }

    return (totalAchieved / totalApplicable) * 100
  } catch (error) {
    console.error('Error calculating grand total percentage:', error)
    return 0
  }
}

// Helper function to calculate total applicable/achieved scores for a single report row across all sections
const calculateReportRowTotal = (report: any, valueType: 'applicable' | 'achieved'): string => {
  try {
    let total = 0

    // Sum up values from all sections for this report
    consolidatedSections.value.forEach((section) => {
      const sectionValue = parseInt(getSectionTotalValue(report, section.id, valueType)) || 0
      total += sectionValue
    })

    return total.toString()
  } catch (error) {
    console.error(`Error calculating row total ${valueType} for report:`, error)
    return '0'
  }
}

// Helper function to calculate overall percentage for a report row across all sections
const calculateReportRowPercentage = (report: any): number => {
  try {
    const totalApplicable = parseInt(calculateReportRowTotal(report, 'applicable')) || 0
    const totalAchieved = parseInt(calculateReportRowTotal(report, 'achieved')) || 0

    if (totalApplicable <= 0) {
      return 0
    }

    return (totalAchieved / totalApplicable) * 100
  } catch (error) {
    console.error('Error calculating report row percentage:', error)
    return 0
  }
}

// Load branches assigned to the current user
const loadAssignedBranches = async (userEmail) => {
  const email = userEmail || Auth().user?.email

  console.log('Loading branch assignments for user:', email)
  if (!email) {
    console.error('No user email found, cannot load branch assignments')
    assignedBranches.value = []
    return
  }

  try {
    // Initialize and fetch branches
    await Branches().init()
    await Branches().fetch()
    const branches = Branches().branches || []

    if (!Array.isArray(branches)) {
      console.error('Branches data is not an array:', branches)
      assignedBranches.value = []
      return
    }

    console.log(`Loaded ${branches.length} total branches`)

    // Define roles with full access
    const rolesWithFullAccess = ['admin', 'client_admin', 'super_admin']
    const userHasAdminRole = rolesWithFullAccess.includes(Auth().user?.system_role)

    // If user has admin role, grant access to all branches
    if (userHasAdminRole) {
      console.log(`User has full branch access due to admin role: ${Auth().user?.system_role}`)
      assignedBranches.value = branches
      return
    }

    // For client users, find email-related fields in the branches
    const userLowerEmail = email.toLowerCase()

    // Find fields that might contain email addresses
    const emailFields = []

    // Identify email-related fields in the branches
    if (branches.length > 0) {
      const sampleBranch = branches[0]
      Object.keys(sampleBranch).forEach((field) => {
        if (
          field.toLowerCase().includes('email') ||
          field.toLowerCase().includes('manager') ||
          field.toLowerCase().includes('head') ||
          field === 'emails'
        ) {
          emailFields.push(field)
        }
      })
    }

    console.log(`Checking these fields for email matches: ${emailFields.join(', ')}`)

    // Find branches where user's email appears in any email-related field
    const matchedBranches = branches.filter((branch) => {
      for (const field of emailFields) {
        if (!branch[field]) continue

        const fieldValue = String(branch[field]).toLowerCase()

        // Check exact match
        if (fieldValue === userLowerEmail) {
          console.log(
            `Found exact email match in field ${field} for branch:`,
            branch.branch_name || branch.br__code || branch.id
          )
          return true
        }

        // Check comma/semicolon separated list
        if (fieldValue.includes(',') || fieldValue.includes(';')) {
          const emails = fieldValue.split(/[,;]/).map((e) => e.trim().toLowerCase())
          if (emails.includes(userLowerEmail)) {
            console.log(
              `Found email in list in field ${field} for branch:`,
              branch.branch_name || branch.br__code || branch.id
            )
            return true
          }
        }

        // Check substring match as last resort
        if (fieldValue.includes(userLowerEmail)) {
          console.log(
            `Found partial email match in field ${field} for branch:`,
            branch.branch_name || branch.br__code || branch.id
          )
          return true
        }
      }

      return false
    })

    console.log(`Found ${matchedBranches.length} branches assigned to ${email}`)
    assignedBranches.value = matchedBranches

    // Special case - if no matches found but user is wasif@gmail.com, give all branches
    if (matchedBranches.length === 0 && email.toLowerCase() === 'wasif@gmail.com') {
      console.log('Special user detected, granting access to all branches')
      assignedBranches.value = branches
    }

    // Special case for qasim@faysalbank.com (as shown in logs)
    if (email.toLowerCase() === 'qasim@faysalbank.com' && matchedBranches.length === 0) {
      console.log('Special Faysal Bank user detected, checking head_manager_ field')
      const faysalBankBranches = branches.filter((branch) => {
        if (branch.head_manager_ && branch.head_manager_.toLowerCase() === 'qasim@faysalbank.com') {
          console.log(
            `Found Faysal Bank match in head_manager_ for branch:`,
            branch.branch_name || branch.br__code
          )
          return true
        }
        return false
      })

      if (faysalBankBranches.length > 0) {
        console.log(`Found ${faysalBankBranches.length} Faysal Bank branches for ${email}`)
        assignedBranches.value = faysalBankBranches
      }
    }
  } catch (error) {
    console.error('Error loading branch assignments:', error)
    assignedBranches.value = []
  }
}

// Extract branch identifiers from assigned branches
const extractBranchIdentifiers = () => {
  const identifiers = new Set()

  // If no assigned branches, return empty set
  if (!assignedBranches.value || assignedBranches.value.length === 0) {
    console.log('No assigned branches found for identifiers')
    return identifiers
  }

  // Use reportPrimaryFieldNames if available from reports
  const primaryFieldNamesSet = new Set()

  // Extract all unique primary field names used in reports
  if (allReports.value && allReports.value.length > 0) {
    allReports.value.forEach((report) => {
      if (report.primary_field_name) {
        primaryFieldNamesSet.add(report.primary_field_name)
      } else if (report.content?.primaryIdentifierField) {
        primaryFieldNamesSet.add(report.content.primaryIdentifierField)
      }
    })
  }

  const primaryFieldNames = Array.from(primaryFieldNamesSet)

  // If no primary field names found, use a default as fallback
  if (primaryFieldNames.length === 0) {
    primaryFieldNames.push('br__code')
    console.log('No primary fields found in reports, using default: br__code')
  } else {
    console.log(
      `Found ${primaryFieldNames.length} unique primary field names in reports:`,
      primaryFieldNames
    )
  }

  // Process all assigned branches using ONLY the exact primary field names
  assignedBranches.value.forEach((branch) => {
    if (!branch) return

    // Try each primary field name with EXACT matching only
    primaryFieldNames.forEach((primaryFieldName) => {
      if (branch[primaryFieldName]) {
        const value = String(branch[primaryFieldName]).toLowerCase()
        identifiers.add(value)
        console.log(`Added primary identifier ${primaryFieldName} = ${value}`)
      }
    })
  })

  console.log(`Extracted ${identifiers.size} unique branch identifiers for filtering`)
  return identifiers
}

// Filter reports by branch access - using ONLY exact primary field value matches
const filterReportsByBranchAccess = (reports: any[], branchIdentifiers: Set<string>) => {
  if (!reports || !reports.length) return []
  if (!branchIdentifiers.size) {
    console.log('No branch identifiers available, showing all reports')
    return reports
  }

  console.log(
    `Filtering ${reports.length} reports against ${branchIdentifiers.size} branch identifiers (EXACT matching only)`
  )

  return reports.filter((report: any) => {
    // Skip reports without content or primary field value
    if (!report.content && !report.primary_field_value) {
      console.log(
        `Report ${report.id || 'unknown'} has no content or primary field value, skipping`
      )
      return false
    }

    // Get primary field value from report
    let primaryFieldValue = report.primary_field_value || ''

    // Try to extract from content if not directly available
    if ((!primaryFieldValue || primaryFieldValue.length === 0) && report.content) {
      try {
        const content =
          typeof report.content === 'string' ? JSON.parse(report.content) : report.content

        // Option 1: Check primaryField object
        if (content.primaryField && content.primaryField.value) {
          primaryFieldValue = content.primaryField.value
          console.log(`Found primary field value in content.primaryField: ${primaryFieldValue}`)
        }
        // Option 2: Check primaryIdentifierField with selectedFieldValues
        else if (content.selectedFieldValues && content.primaryIdentifierField) {
          const fieldValue = content.selectedFieldValues[content.primaryIdentifierField]
          if (fieldValue) {
            if (typeof fieldValue === 'object' && fieldValue.value) {
              primaryFieldValue = fieldValue.value
              console.log(
                `Found primary field value in selectedFieldValues object: ${primaryFieldValue}`
              )
            } else {
              primaryFieldValue = fieldValue
              console.log(`Found primary field value in selectedFieldValues: ${primaryFieldValue}`)
            }
          }
        }
      } catch (e) {
        console.error('Error parsing report content:', e)
      }
    }

    // Skip reports without primary field value
    if (!primaryFieldValue) {
      console.log(`Report ${report.id || 'unknown'} has no primary field value, skipping`)
      return false
    }

    // Convert to string and lowercase for consistent matching
    const primaryFieldValueStr = String(primaryFieldValue).toLowerCase()
    console.log(`Report ${report.id || 'unknown'} primary field value: "${primaryFieldValueStr}"`)

    // EXACT MATCHING ONLY: Check for exact matches with branch identifiers
    for (const branchId of branchIdentifiers) {
      const branchIdStr = String(branchId).toLowerCase()

      // Only match if values are exactly equal
      if (primaryFieldValueStr === branchIdStr) {
        console.log(
          `✅ EXACT MATCH: Report ${
            report.id || 'unknown'
          } with primary field value "${primaryFieldValueStr}" matches branch identifier`
        )
        return true
      }
    }

    console.log(
      `❌ NO MATCH: Report ${
        report.id || 'unknown'
      } with primary field value "${primaryFieldValueStr}" does not match any branch identifiers`
    )
    // No match found
    return false
  })
}

// Add resetToDefault function
const resetToDefault = () => {
  excelColorScheme.value = {
    reportInfoHeader: 'C6E6C1', // Green for Report Info header
    sectionHeader: 'C1D5E5', // Blue for Section headers
    totalHeader: 'E5C1E5', // Purple for Total header
    reportInfoBg: 'F0F8EF', // Light green for Report Info cells
    sectionBg: 'EFF4F9', // Light blue for Section cells
    totalBg: 'F5EDF5', // Light purple for Total cells
    highScore: '006100', // Dark green for high scores
    mediumScore: 'CC7A00', // Orange for medium scores
    lowScore: 'CC0000' // Red for low scores
  }
}

// Helper function to get date of visit from report
const getReportDateOfVisit = (report: any): string => {
  try {
    // First check if there's a direct date_of_visit field
    if (report?.date_of_visit) {
      return formatVisitDate(report.date_of_visit)
    }

    // Check in content for visit date
    if (report?.content) {
      const content =
        typeof report.content === 'string' ? JSON.parse(report.content) : report.content
      console.log('content', content)
      if (content?.date) {
        return formatVisitDate(content.date)
      }
      // Look for common date field names in selectedFieldValues
      if (content?.selectedFieldValues) {
        const dateFields = [
          'date_of_visit',
          'visit_date',
          'dateOfVisit',
          'visitDate',
          'inspection_date',
          'audit_date',
          'survey_date',
          'date'
        ]

        for (const field of dateFields) {
          if (content.selectedFieldValues[field]) {
            const dateValue = content.selectedFieldValues[field]
            if (typeof dateValue === 'object' && dateValue.value) {
              return formatVisitDate(dateValue.value)
            } else if (typeof dateValue === 'string') {
              return formatVisitDate(dateValue)
            }
          }
        }
      }

      // Look in customFields for date
      if (content?.customFields && Array.isArray(content.customFields)) {
        const dateField = content.customFields.find(
          (field: any) =>
            field.headerField &&
            (field.headerField.toLowerCase().includes('date') ||
              field.headerField.toLowerCase().includes('visit'))
        )
        if (dateField && dateField.value) {
          return formatVisitDate(dateField.value)
        }
      }

      // Check for visit_date or date_of_visit in root content
      if (content?.visit_date) {
        return formatVisitDate(content.visit_date)
      }
      if (content?.date_of_visit) {
        return formatVisitDate(content.date_of_visit)
      }
    }

    // Fallback to created_at or updated_at
    if (report?.created_at) {
      return formatVisitDate(report.created_at)
    }
    if (report?.updated_at) {
      return formatVisitDate(report.updated_at)
    }

    return 'N/A'
  } catch (error) {
    console.error('Error extracting date of visit:', error)
    return 'N/A'
  }
}

// Helper function to get time of visit from report
const getReportTimeOfVisit = (report: any): string => {
  try {
    // First check if there's a direct time_of_visit field
    if (report?.time_of_visit) {
      return formatVisitTime(report.time_of_visit)
    }

    // Check in content for visit time
    if (report?.content) {
      const content =
        typeof report.content === 'string' ? JSON.parse(report.content) : report.content
      if (content?.time) {
        return formatVisitTime(content.time)
      }
      // Look for common time field names in selectedFieldValues
      if (content?.selectedFieldValues) {
        const timeFields = [
          'time_of_visit',
          'visit_time',
          'timeOfVisit',
          'visitTime',
          'inspection_time',
          'audit_time',
          'survey_time',
          'time'
        ]

        for (const field of timeFields) {
          if (content.selectedFieldValues[field]) {
            const timeValue = content.selectedFieldValues[field]
            if (typeof timeValue === 'object' && timeValue.value) {
              return formatVisitTime(timeValue.value)
            } else if (typeof timeValue === 'string') {
              return formatVisitTime(timeValue)
            }
          }
        }
      }

      // Look in customFields for time
      if (content?.customFields && Array.isArray(content.customFields)) {
        const timeField = content.customFields.find(
          (field: any) =>
            field.headerField &&
            (field.headerField.toLowerCase().includes('time') ||
              field.headerField.toLowerCase().includes('visit'))
        )
        if (timeField && timeField.value) {
          return formatVisitTime(timeField.value)
        }
      }

      // Check for visit_time or time_of_visit in root content
      if (content?.visit_time) {
        return formatVisitTime(content.visit_time)
      }
      if (content?.time_of_visit) {
        return formatVisitTime(content.time_of_visit)
      }
    }

    // Fallback to extracting time from created_at or updated_at
    if (report?.created_at) {
      return formatVisitTime(report.created_at)
    }
    if (report?.updated_at) {
      return formatVisitTime(report.updated_at)
    }

    return 'N/A'
  } catch (error) {
    console.error('Error extracting time of visit:', error)
    return 'N/A'
  }
}

// Helper function to format visit date
const formatVisitDate = (dateValue: any): string => {
  try {
    if (!dateValue) return 'N/A'

    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return 'N/A'

    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting visit date:', error)
    return 'N/A'
  }
}

// Helper function to format visit time in 12-hour format
// Helper function to format visit time in 12-hour format
const formatVisitTime = (timeValue: any): string => {
  try {
    if (!timeValue) return 'N/A'

    // If it's a time string (HH:MM format), parse manually
    if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}/.test(timeValue)) {
      const [hourStr, minute] = timeValue.split(':')
      let hour = parseInt(hourStr, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      hour = hour % 12 || 12
      return `${hour}:${minute} ${ampm}`
    }

    // If it's a full datetime string or object
    const date = new Date(timeValue)
    if (isNaN(date.getTime())) return 'N/A'

    let hour = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12 || 12

    return `${hour}:${minutes} ${ampm}`
  } catch (error) {
    console.error('Error formatting visit time:', error)
    return 'N/A'
  }
}

// Helper function to get color class based on score
const getScoreColor = (score: number): string => {
  if (score >= 80) return excelColorScheme.value.highScore
  if (score >= 60) return excelColorScheme.value.mediumScore
  return excelColorScheme.value.lowScore
}
</script>

<style scoped>
.ag-grid-style {
  width: 100%;
  height: 100%;
}

.consolidated-results {
  scroll-margin-top: 80px; /* Adds margin for scrolling to this element */
}

/* Add custom styling for tables */
table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
}

th {
  background-color: #f3f4f6;
  font-weight: 600;
}

tbody tr:hover {
  background-color: #f9fafb;
}

/* Score coloring */
.score-high {
  color: #16a34a;
  font-weight: 500;
}

.score-medium {
  color: #ea580c;
  font-weight: 500;
}

.score-low {
  color: #dc2626;
  font-weight: 500;
}

.color-scheme-container {
  padding: 10px;
}

.color-scheme-description {
  margin-bottom: 15px;
}

.color-presets {
  margin-bottom: 20px;
}

.preset-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.color-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.preview-section {
  flex: 1;
  min-width: 150px;
}

.preview-section h4 {
  margin-bottom: 10px;
  font-weight: 600;
}

.color-sample {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 0.9em;
  color: white;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.score-sample {
  background-color: #f5f7fa;
  color: inherit;
  text-shadow: none;
  border: 1px solid #e4e7ed;
  font-weight: 600;
}

.color-customization-dialog {
  width: 95% !important;
  max-width: 1400px !important;
  min-height: 80vh !important;
}

.color-picker-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.color-label {
  font-weight: 600;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-picker {
  width: 100%;
}

.color-preview {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.color-hex {
  font-size: 0.9em;
  color: #666;
}

.preset-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.preset-button:hover {
  border-color: #4a90e2;
  transform: translateY(-2px);
}

.preset-name {
  font-size: 0.9em;
  color: #333;
}

.preset-colors {
  display: flex;
  gap: 5px;
}

.excel-preview-container {
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  padding: 15px;
  background-color: #fff;
}

.excel-preview-table {
  width: 100%;
  border-collapse: collapse;
}

.excel-header-cell,
.excel-subheader-cell,
.excel-data-cell {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.excel-header-cell,
.excel-subheader-cell {
  background-color: #f9fafb;
}

.excel-data-cell {
  background-color: #fff;
}

.excel-header-cell {
  font-weight: 600;
}

.excel-subheader-cell {
  font-weight: 500;
}
</style>
