<template>
  <DefaultLayout title="Consolidated Sheet">
    <div class="container mx-auto px-4 py-6">
      <div class="">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-semibold text-gray-800">Consolidated Sheet</h1>
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

        <!-- Consolidated Sheet Button -->
        <div class="mb-6">
          <Button
            label="See Consolidated Sheet"
            type="button"
            @click="generateConsolidatedReports"
            :disabled="!hasFilteredReports"
            :class="{
              'bg-green-600': hasFilteredReports,
              'bg-gray-400 cursor-not-allowed': !hasFilteredReports
            }"
          />
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
            :loading="loads"
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
          <h2 class="text-xl font-semibold text-gray-800">Consolidated Results</h2>
          <div class="flex space-x-2">
            <Button
              label="Export Results"
              type="button"
              @click="showColorCustomizationDialog = true"
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
                <!-- Basic info header -->
                <th
                  :colspan="consolidatedTableHeaders.length"
                  class="py-3 px-4 border-b text-center font-bold text-gray-800 bg-green-100"
                >
                  Report Information
                </th>
                <!-- Section headers -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`section-header-${sIndex}`"
                >
                  <th class="py-3 px-4 border-b text-center font-bold text-gray-800 bg-blue-100">
                    {{ section.name }}
                  </th>
                </template>
                <!-- Report Total header -->
                <th class="py-3 px-4 border-b text-center font-bold text-gray-800 bg-purple-100">
                  Total Score
                </th>
              </tr>
              <tr class="bg-gray-50">
                <!-- Second row: Column headers -->
                <th
                  v-for="(header, index) in consolidatedTableHeaders"
                  :key="`header-${index}`"
                  class="py-2 px-3 border-b text-center font-medium text-gray-700 bg-green-50"
                  :class="{ 'min-w-[250px]': header.key === 'reportName' }"
                >
                  {{ header.display }}
                </th>

                <!-- Section score headers -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`section-${sIndex}`"
                >
                  <th class="py-2 px-3 border-b text-center font-medium text-gray-700 bg-blue-50">
                    Score (%)
                  </th>
                </template>

                <!-- Report total header -->
                <th class="py-2 px-3 border-b text-center font-medium text-gray-700 bg-purple-50">
                  Overall (%)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in consolidatedData" :key="index" class="hover:bg-gray-50">
                <!-- Report information columns -->
                <td
                  v-for="(header, headerIndex) in consolidatedTableHeaders"
                  :key="`data-${headerIndex}`"
                  class="py-2 px-3 border-b text-center"
                  :class="[
                    (header.key === 'averageScore' || header.key === 'overall_performance') &&
                    item._rawContent?.reports?.some((s: any) => checkSectionFatalError(s))
                      ? 'bg-red-500 text-white'
                      : header.key === 'averageScore' || header.key === 'overall_performance'
                      ? getScoreColorClass(item[header.key])
                      : '',
                    { 'min-w-[250px] text-left': header.key === 'reportName' }
                  ]"
                >
                  <!-- Render based on field type -->
                  <template v-if="Array.isArray(item[header.key])">
                    <ul class="list-disc list-inside text-left">
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

                <!-- Section scores -->
                <template
                  v-for="(section, sIndex) in consolidatedSections"
                  :key="`data-section-${sIndex}`"
                >
                  <td
                    class="py-2 px-3 border-b text-center font-medium"
                    :class="getScoreColorClass(getSectionScorePercentage(item, section.id))"
                  >
                    {{ getSectionScorePercentage(item, section.id).toFixed(2) }}%
                  </td>
                </template>

                <!-- Report total score -->
                <td
                  class="py-2 px-3 border-b text-center font-medium"
                  :class="
                    item._rawContent?.reports?.some((s: any) => checkSectionFatalError(s))
                      ? 'bg-red-500 text-white'
                      : getScoreColorClass(getReportTotalPercentage(item))
                  "
                >
                  <template
                    v-if="item._rawContent?.reports?.some((s: any) => checkSectionFatalError(s))"
                  >
                    ⚠️ FATAL ERROR
                  </template>
                  <template v-else> {{ getReportTotalPercentage(item).toFixed(2) }}% </template>
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
              Charts and visualizations would appear here based on the consolidated data
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
            Choose colors that match your brand or preferences. See live preview on the right as you
            make changes.
          </p>
        </div>

        <div class="flex flex-col xl:flex-row gap-8">
          <!-- Left Panel - Color Controls -->
          <div class="xl:w-2/5 flex flex-col space-y-6">
            <!-- Quick Presets Section -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="mr-2">🎨</span>
                Quick Color Presets
              </h4>
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  @click="applyPresetColors('default')"
                  class="preset-button bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500"
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
                  class="preset-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                  class="preset-button bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
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
                  class="preset-button bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800"
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
                  class="preset-button bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                >
                  <span class="preset-name">Dark Theme</span>
                  <div class="preset-colors">
                    <div class="color-dot" style="background: #134f5c"></div>
                    <div class="color-dot" style="background: #0f243e"></div>
                    <div class="color-dot" style="background: #4a266a"></div>
                  </div>
                </button>

                <button
                  @click="resetToDefault"
                  class="preset-button bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600"
                >
                  <span class="preset-name">Reset</span>
                  <div class="preset-colors">
                    <div class="color-dot bg-gray-300"></div>
                    <div class="color-dot bg-gray-400"></div>
                    <div class="color-dot bg-gray-500"></div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Custom Colors Section -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="mr-2">🎯</span>
                Custom Colors
              </h4>

              <!-- Header Colors -->
              <div class="mb-6">
                <h5 class="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <span class="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Header Colors
                </h5>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="color-picker-group">
                    <label class="color-label">Report Info Header</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.reportInfoHeader"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.reportInfoHeader}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.reportInfoHeader }}</span>
                    </div>
                  </div>

                  <div class="color-picker-group">
                    <label class="color-label">Section Header</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.sectionHeader"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.sectionHeader}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.sectionHeader }}</span>
                    </div>
                  </div>

                  <div class="color-picker-group">
                    <label class="color-label">Total Header</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.totalHeader"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.totalHeader}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.totalHeader }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Background Colors -->
              <div class="mb-6">
                <h5 class="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Background Colors
                </h5>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="color-picker-group">
                    <label class="color-label">Report Info Background</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.reportInfoBg"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.reportInfoBg}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.reportInfoBg }}</span>
                    </div>
                  </div>

                  <div class="color-picker-group">
                    <label class="color-label">Section Background</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.sectionBg"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.sectionBg}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.sectionBg }}</span>
                    </div>
                  </div>

                  <div class="color-picker-group">
                    <label class="color-label">Total Background</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.totalBg"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.totalBg}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.totalBg }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Score Colors -->
              <div>
                <h5 class="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                  Score Colors
                </h5>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="color-picker-group">
                    <label class="color-label">High Score (≥80%)</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.highScore"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.highScore}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.highScore }}</span>
                    </div>
                  </div>

                  <div class="color-picker-group">
                    <label class="color-label">Medium Score (60-79%)</label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.mediumScore"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.mediumScore}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.mediumScore }}</span>
                    </div>
                  </div>

                  <div class="color-picker-group">
                    <label class="color-label">Low Score (60%) </label>
                    <div class="color-picker-wrapper">
                      <ColorPicker
                        v-model="excelColorScheme.lowScore"
                        format="hex"
                        class="custom-color-picker"
                      />
                      <div
                        class="color-preview"
                        :style="{ backgroundColor: `#${excelColorScheme.lowScore}` }"
                      ></div>
                      <span class="color-value">#{{ excelColorScheme.lowScore }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Panel - Live Preview -->
          <div class="xl:w-3/5 flex flex-col">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
              <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span class="mr-2">👁️</span>
                Live Preview
                <span class="ml-auto text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Excel Export Preview
                </span>
              </h4>

              <!-- Preview Container with Excel-like styling -->
              <div
                class="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner"
              >
                <!-- Excel Header Info -->
                <div class="bg-gray-50 p-4 border-b border-gray-200">
                  <div class="flex items-center justify-between">
                    <div>
                      <h5 class="font-semibold text-gray-800">📊 Consolidated Sheet</h5>
                      <div class="text-sm text-gray-600 mt-1 space-y-1">
                        <div class="flex items-center">
                          <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Total Reports: {{ consolidatedStats.totalReports }}
                        </div>
                        <div class="flex items-center">
                          <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Average Score: {{ consolidatedStats.averageScore }}%
                        </div>
                        <div class="flex items-center">
                          <span class="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                          Date Range: {{ consolidatedStats.dateRange }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right text-xs text-gray-500">
                      <div>Preview shows first 3 rows</div>
                      <div>Actual export includes all data</div>
                    </div>
                  </div>
                </div>

                <!-- Excel Table Preview -->
                <div class="overflow-auto max-h-96">
                  <table class="w-full excel-preview-table">
                    <thead>
                      <tr>
                        <!-- Report Information header -->
                        <th
                          :colspan="Math.max(consolidatedTableHeaders.length, 3)"
                          :style="{
                            backgroundColor: `#${excelColorScheme.reportInfoHeader}`,
                            color: '#FFFFFF'
                          }"
                          class="excel-header-cell"
                        >
                          📋 Report Information
                        </th>
                        <!-- Section headers -->
                        <template
                          v-for="(section, index) in consolidatedSections.slice(0, 2)"
                          :key="`preview-section-${index}`"
                        >
                          <th
                            :style="{
                              backgroundColor: `#${excelColorScheme.sectionHeader}`,
                              color: '#FFFFFF'
                            }"
                            class="excel-header-cell"
                          >
                            📊 {{ section.name }}
                          </th>
                        </template>
                        <!-- Total Score header -->
                        <th
                          :style="{
                            backgroundColor: `#${excelColorScheme.totalHeader}`,
                            color: '#FFFFFF'
                          }"
                          class="excel-header-cell"
                        >
                          🎯 Total Score
                        </th>
                      </tr>
                      <tr>
                        <!-- Column headers -->
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
                          Overall Performance
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
                        <!-- Section score headers -->
                        <template
                          v-for="(section, index) in consolidatedSections.slice(0, 2)"
                          :key="`preview-section-score-${index}`"
                        >
                          <th
                            :style="{ backgroundColor: `#${excelColorScheme.sectionBg}` }"
                            class="excel-subheader-cell"
                          >
                            Score (%)
                          </th>
                        </template>
                        <!-- Total score header -->
                        <th
                          :style="{ backgroundColor: `#${excelColorScheme.totalBg}` }"
                          class="excel-subheader-cell"
                        >
                          Overall (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- Sample data rows -->
                      <tr
                        v-for="(item, rowIndex) in consolidatedData.slice(0, 3)"
                        :key="`preview-row-${rowIndex}`"
                      >
                        <td class="excel-data-cell text-left">
                          {{ item.reportName || `Sample Report ${rowIndex + 1}` }}
                        </td>
                        <td class="excel-data-cell">
                          {{ item.branch || `Branch ${rowIndex + 1}` }}
                        </td>
                        <td class="excel-data-cell">{{ item.overall_performance || 'N/A' }}%</td>
                        <td class="excel-data-cell">
                          {{ item.dateOfVisit || '2024-01-15' }}
                        </td>
                        <td class="excel-data-cell">
                          {{ item.timeOfVisit || '10:00' }}
                        </td>
                        <!-- Section scores -->
                        <template
                          v-for="(section, sIndex) in consolidatedSections.slice(0, 2)"
                          :key="`preview-section-data-${rowIndex}-${sIndex}`"
                        >
                          <td
                            class="excel-data-cell font-semibold"
                            :style="{
                              color: `#${getScoreColor(
                                getSectionScorePercentage(item, section.id) || 85 - rowIndex * 10
                              )}`
                            }"
                          >
                            {{
                              (
                                getSectionScorePercentage(item, section.id) || 85 - rowIndex * 10
                              ).toFixed(1)
                            }}%
                          </td>
                        </template>
                        <!-- Total score -->
                        <td
                          class="excel-data-cell font-bold"
                          :style="{
                            color: `#${getScoreColor(
                              getReportTotalPercentage(item) || 80 - rowIndex * 8
                            )}`,
                            backgroundColor: `#${excelColorScheme.totalBg}20`
                          }"
                        >
                          {{ (getReportTotalPercentage(item) || 80 - rowIndex * 8).toFixed(1) }}%
                        </td>
                      </tr>

                      <!-- Fallback sample rows if no data -->
                      <template v-if="consolidatedData.length === 0">
                        <tr v-for="rowIndex in 3" :key="`sample-row-${rowIndex}`">
                          <td class="excel-data-cell text-left">Sample Report {{ rowIndex }}</td>
                          <td class="excel-data-cell">Branch {{ rowIndex }}</td>
                          <td class="excel-data-cell">{{ 85 - rowIndex * 10 }}%</td>
                          <td class="excel-data-cell">2024-01-{{ 10 + rowIndex }}</td>
                          <td class="excel-data-cell">10:00</td>
                          <td
                            class="excel-data-cell font-semibold"
                            :style="{ color: `#${getScoreColor(85 - rowIndex * 10)}` }"
                          >
                            {{ 85 - rowIndex * 10 }}%
                          </td>
                          <td
                            class="excel-data-cell font-semibold"
                            :style="{ color: `#${getScoreColor(78 - rowIndex * 8)}` }"
                          >
                            {{ 78 - rowIndex * 8 }}%
                          </td>
                          <td
                            class="excel-data-cell font-bold"
                            :style="{
                              color: `#${getScoreColor(80 - rowIndex * 8)}`,
                              backgroundColor: `#${excelColorScheme.totalBg}20`
                            }"
                          >
                            {{ 80 - rowIndex * 8 }}%
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>

                <!-- Preview Footer -->
                <div class="bg-gray-50 p-3 border-t border-gray-200 text-center">
                  <p class="text-xs text-gray-600">
                    ✨ This preview shows how your Excel export will look with the selected colors
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-gray-200">
          <div class="flex items-center space-x-2 text-sm text-gray-600">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Changes are applied instantly to preview</span>
          </div>
          <div class="flex items-center space-x-3">
            <Button
              label="Cancel"
              type="button"
              @click="showColorCustomizationDialog = false"
              class="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            />
            <Button
              label="🚀 Export with Custom Colors"
              type="button"
              @click="performExcelExport"
              class="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all transform hover:scale-105 shadow-lg"
            />
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
const gridApi = ref(null)
const showExportOptions = ref(false)
const showColorCustomizationDialog = ref(false)
const showConsolidatedResults = ref(false)
const consolidatedData = ref([])
const consolidatedStats = ref({
  totalReports: 0,
  averageScore: 0,
  dateRange: 'All Time'
})
const consolidatedTableHeaders = ref([])
const consolidatedSections = ref([])
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
const assignedBranches = ref([])

// Grid API safe wrapper functions
const safeGridApi = {
  showLoadingOverlay: () => {
    setTimeout(() => {
      try {
        if (gridApi.value) {
          gridApi.value.showLoadingOverlay()
        }
      } catch (err) {
        console.error('Error showing loading overlay:', err)
      }
    }, 0)
  },

  hideOverlay: () => {
    setTimeout(() => {
      try {
        if (gridApi.value) {
          gridApi.value.hideOverlay()
        }
      } catch (err) {
        console.error('Error hiding overlay:', err)
      }
    }, 0)
  },

  showNoRowsOverlay: () => {
    setTimeout(() => {
      try {
        if (gridApi.value) {
          gridApi.value.showNoRowsOverlay()
        }
      } catch (err) {
        console.error('Error showing no rows overlay:', err)
      }
    }, 0)
  },

  refreshCells: () => {
    setTimeout(() => {
      try {
        if (gridApi.value) {
          gridApi.value.refreshCells()
        }
      } catch (err) {
        console.error('Error refreshing cells:', err)
      }
    }, 0)
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
    // Check various possible answer field names and formats
    const answer = (q.answer || q.response || q.value || '').toString().toLowerCase().trim()
    return answer === 'yes' || answer === 'true' || answer === '1'
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

// Extract branch identifiers from assigned branches - using only primary field names
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
const filterReportsByBranchAccess = (reports, branchIdentifiers) => {
  if (!reports || !reports.length) return []
  if (!branchIdentifiers.size) {
    console.log('No branch identifiers available, showing all reports')
    return reports
  }

  console.log(
    `Filtering ${reports.length} reports against ${branchIdentifiers.size} branch identifiers (EXACT matching only)`
  )

  return reports.filter((report) => {
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

// Load reports based on user email
const loadReports = async () => {
  // Clear reports and errors first
  allReports.value = []
  loading.value = true
  errorMessage.value = null

  console.log('Loading reports for client user')
  try {
    // Get user email and role for filtering - define these at the top of the function
    const userEmail = currentUser.value?.email
    const userRole = currentUser.value?.role || 'client_user'

    if (!userEmail) {
      console.error('User email not found, cannot load reports')
      errorMessage.value = 'User email not found'
      loading.value = false
      return
    }

    console.log(`User email: ${userEmail}`)

    // First load all the client's branches to determine user access
    try {
      await loadAssignedBranches(userEmail)
    } catch (branchError) {
      console.error('Error loading branch assignments:', branchError)
      // Show a toast notification but continue loading reports
      Toast.warn('Could not load branch assignments. Showing all available reports instead.')
      // Continue with empty assignments - will fall back to backend filtering
      assignedBranches.value = []
    }

    if (assignedBranches.value.length === 0) {
      console.log('No branches assigned to this user, may have limited report access')
    } else {
      console.log(`Found ${assignedBranches.value.length} branches assigned to user`)
    }

    // Extract primary field values from user's branches for filtering
    const primaryFieldValues = new Set()

    // Create a comprehensive set of identifying values from assigned branches
    assignedBranches.value.forEach((branch) => {
      // Dynamically extract identifiers from branch data
      const extractBranchIdentifiers = (branch) => {
        const identifiers = new Set()

        // Skip if branch is not a valid object
        if (!branch || typeof branch !== 'object') {
          return []
        }

        // Process all fields in the branch object
        Object.entries(branch).forEach(([key, value]) => {
          // Skip empty or null values
          if (!value) return

          // Convert value to string and lowercase for consistent matching
          const strValue = String(value).toLowerCase()

          // Skip very long values and empty strings as they're unlikely to be identifiers
          if (strValue.length === 0 || strValue.length > 100) return

          // Skip array values that might have been flattened incorrectly
          if (Array.isArray(value)) return

          // Category 1: Fields that look like identifiers by name
          if (
            key.toLowerCase().includes('id') ||
            key.toLowerCase().includes('code') ||
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('number')
          ) {
            identifiers.add(strValue)
            return // Found an identifier, no need to check other conditions
          }

          // Category 2: Fields that sound like branch identifiers
          if (
            key.toLowerCase().includes('branch') ||
            key.toLowerCase().includes('location') ||
            key.toLowerCase().includes('store') ||
            key.toLowerCase().includes('site') ||
            key.toLowerCase().includes('outlet')
          ) {
            identifiers.add(strValue)
            return // Found an identifier, no need to check other conditions
          }

          // Category 3: Short string/number values that could be codes
          if (
            (typeof value === 'string' || typeof value === 'number') &&
            strValue.length <= 20 &&
            (/^[a-z0-9_-]+$/i.test(strValue) || // Alphanumeric with underscores/hyphens
              /^[0-9]+$/.test(strValue)) // Numeric values
          ) {
            identifiers.add(strValue)
          }

          // Category 4: UUIDs (which are often used as IDs)
          if (
            typeof value === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(strValue)
          ) {
            identifiers.add(strValue)
          }
        })

        return Array.from(identifiers)
      }

      // Get identifiers for this branch and add them to the primaryFieldValues set
      const branchIdentifiers = extractBranchIdentifiers(branch)
      console.log(
        `Found ${branchIdentifiers.length} identifiers for branch:`,
        branch.id || branch.code || branch.branch_code || branch.branch_name || 'Unknown'
      )

      // Add all identified values to our set
      branchIdentifiers.forEach((identifier) => primaryFieldValues.add(identifier))
    })

    console.log(
      `Found ${primaryFieldValues.size} unique identifiers across all branches:`,
      Array.from(primaryFieldValues)
    )

    // Load all reports for the client
    let response = []
    try {
      // For regular users (non-admin), rely on backend filtering
      // wasif@gmail.com has special privileges defined in loadAssignedBranches
      const isSpecialUser = userEmail.toLowerCase() === 'wasif@gmail.com'

      console.log(
        'About to make API request with userRole:',
        userRole,
        'for client_user, backend should filter to approved-only'
      )
      response = await Reports().getClientReports(
        client.value.uuid,
        null, // userId
        userEmail,
        userRole
      )
      console.log(`Loaded ${response.length} total reports with user role: ${userRole}`)

      // Debug the received reports
      if (response.length > 0) {
        console.log(
          'Reports received from backend - statuses:',
          response.map((report) => report.status)
        )
        if (userRole === 'client_user') {
          // Check if backend is correctly filtering
          const nonApprovedCount = response.filter((report) => report.status !== 'approved').length
          if (nonApprovedCount > 0) {
            console.warn(
              `Backend returned ${nonApprovedCount} non-approved reports despite client_user role!`
            )
          }
        }
      }
    } catch (error) {
      console.error('Error loading reports from API:', error)
      errorMessage.value =
        'Failed to load reports: ' + (error.response?.data?.message || error.message)
      loading.value = false
      return
    }

    // Only apply frontend filtering for users with branch assignments
    // For users without assignments, we'll rely on the backend filtering
    if (primaryFieldValues.size > 0 && assignedBranches.value.length > 0) {
      // If we have branch data, filter reports by primary field values
      let branchFilteredReports = response

      // First filter by client user role if needed - only show approved reports
      if (userRole === 'client_user') {
        console.log('Filtering to only show approved reports for client_user')
        branchFilteredReports = response.filter((report) => report.status === 'approved')
        console.log(`After status filtering: ${branchFilteredReports.length} reports remain`)
      }

      // Then apply branch filtering
      allReports.value = branchFilteredReports.filter((report) => {
        // Check primary_field_value first
        console.log('=== Processing Report ===')
        console.log('Report ID:', report.id)
        console.log('Report Template:', report.template_name)

        let primaryFieldValue = report.primary_field?.value
        console.log('Initial Primary Field Value:', primaryFieldValue)

        // If no primary field value, try get it from content
        if (!primaryFieldValue && report.content) {
          try {
            console.log('Attempting to find primary field value in content')
            if (report.content.primaryField && report.content.primaryField.value) {
              primaryFieldValue = report.content.primaryField.value
              console.log('Found primary field value in content.primaryField:', primaryFieldValue)
            } else if (
              report.content.selectedFieldValues &&
              report.content.primaryIdentifierField
            ) {
              console.log('Checking selectedFieldValues for primary identifier')
              const fieldValue =
                report.content.selectedFieldValues[report.content.primaryIdentifierField]
              if (fieldValue) {
                if (typeof fieldValue === 'object' && fieldValue.value) {
                  primaryFieldValue = fieldValue.value
                  console.log(
                    'Found primary field value in selectedFieldValues object:',
                    primaryFieldValue
                  )
                } else {
                  primaryFieldValue = fieldValue
                  console.log(
                    'Found primary field value in selectedFieldValues:',
                    primaryFieldValue
                  )
                }
              }
            }
          } catch (e) {
            console.error(`Error parsing report content for ${report.id}:`, e)
          }
        }

        if (!primaryFieldValue) {
          console.log(
            `Report ${report.id} has no primary field value, searching in all content fields`
          )
          // Try to find any identifier in the report content
          if (report.content) {
            try {
              console.log('Available branch values to match against:', primaryFieldValues)
              // Look for branch identifiers in any field
              const contentFields = Object.entries(report.content)
              console.log(
                'Content fields to search:',
                contentFields.map(([key]) => key)
              )

              for (const [key, value] of contentFields) {
                if (typeof value === 'string' || typeof value === 'number') {
                  const strValue = String(value).toLowerCase()
                  console.log(`Checking field "${key}" with value "${strValue}"`)

                  // Check for exact match only (no partial matches)
                  if (reportValue === branchValue) {
                    console.log(
                      `✅ Match found: Report value "${reportValue}" matches branch field "${matchingKey}" with value "${branchValue}"`
                    )
                    return true
                  }
                }
              }
            } catch (e) {
              console.error(`Error looking for identifiers in report content:`, e)
            }
          }

          // If we still don't have a value, use template_name as a last resort
          if (!primaryFieldValue && report.template_name) {
            primaryFieldValue = report.template_name.toLowerCase()
            console.log(`Using template_name as last resort: ${primaryFieldValue}`)
          }

          if (!primaryFieldValue) {
            console.log(`❌ No primary field value found for report ${report.id}`)
            return false
          }
        }

        const reportValue = String(primaryFieldValue).toLowerCase()
        console.log(`Final report value to compare: "${reportValue}"`)
        console.log('Available branch values:', Array.from(primaryFieldValues))

        // Check if this report's primary field value matches any of our branch values
        for (const branchValue of primaryFieldValues) {
          console.log('primaryFieldValues', primaryFieldValues)

          console.log(`Comparing "${reportValue}" with branch value "${branchValue}"`)
          if (reportValue === branchValue) {
            console.log(
              `✅ Match found: Report ${report.id} with value "${reportValue}" matches branch value "${branchValue}"`
            )
            return true
          }
        }

        // Special case: if reportValue contains numbers that match branch values
        if (/\d+/.test(reportValue)) {
          const numbers = reportValue.match(/\d+/g)
          if (numbers) {
            console.log('Extracted numbers from report value:', numbers)
            for (const num of numbers) {
              if (primaryFieldValues.has(num)) {
                console.log(
                  `✅ Match found via numeric extraction: Report ${report.id} contains branch number ${num}`
                )
                return true
              }
            }
          }
        }

        console.log(
          `❌ No match found: Report ${report.id} with value "${reportValue}" does not match any branch values`
        )
        return false
      })

      console.log(`Filtered to ${allReports.value.length} reports based on branch access`)

      // FALLBACK: If no reports matched but we have reports and the user is wasif@gmail.com,
      // show all reports as a fallback
      if (
        allReports.value.length === 0 &&
        response.length > 0 &&
        userEmail.toLowerCase() === 'wasif@gmail.com'
      ) {
        console.log(
          `⚠️ No reports matched filtering criteria for admin user. Showing all ${response.length} reports`
        )

        // Even for special users, still apply client_user status filter if needed
        if (userRole === 'client_user') {
          const approvedReports = response.filter((report) => report.status === 'approved')
          console.log(
            `Filtering to ${approvedReports.length} approved reports for special client_user`
          )
          allReports.value = approvedReports
        } else {
          allReports.value = response
        }
      }
    } else {
      // If no branch data or no assigned branches, use the reports from backend filtering
      console.log(
        'No branch data available for frontend filtering, using backend filtered reports directly'
      )

      // Even when using backend filtering, apply client_user status filter if needed
      if (userRole === 'client_user') {
        const approvedReports = response.filter((report) => report.status === 'approved')
        console.log(
          `Filtering backend results to ${approvedReports.length} approved reports for client_user`
        )
        allReports.value = approvedReports
      } else {
        allReports.value = response
      }
    }
    console.log('All reports:', allReports.value)
    if (allReports.value.length === 0) {
      console.log('No reports found after filtering')
      if (response.length > 0) {
        console.log('Response:', response)
        errorMessage.value =
          'No reports found for your assigned branches. Please contact your administrator if this is incorrect.'
      } else {
        errorMessage.value = 'No reports found for this client'
      }
    } else {
      console.log(`Successfully loaded ${allReports.value.length} reports for display`)

      // DEBUG: Log the structure of the first report to help debug
      if (allReports.value.length > 0) {
        console.log('First report structure:', {
          keys: Object.keys(allReports.value[0]),
          hasTemplateNameKey: 'template_name' in allReports.value[0],
          hasPrimaryFieldValueKey: 'primary_field_value' in allReports.value[0],
          report: allReports.value[0]
        })
      }
    }
  } catch (error) {
    console.error('Error loading reports:', error)
    errorMessage.value =
      'Failed to load reports: ' + (error.response?.data?.message || error.message)
  } finally {
    loading.value = false
  }
}
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
    // Check if user has any branch assignments
    if (assignedBranches.value.length === 0 && !Auth().isAdmin()) {
      console.log('No branches assigned to this user, no reports will be shown')
      errorMessage.value =
        'You do not have any branch assignments. Please contact your administrator to get access.'
      loading.value = false
      safeGridApi.showNoRowsOverlay()
      // Clear any existing reports
      allReports.value = []
      return // Stop here and don't load any reports
    }

    // Use the Consolidated Sheet function
    const response = await Reports().getConsolidatedReports()
    allReports.value = response
    console.log('Fetched Consolidated Sheet:', allReports.value)

    safeGridApi.hideOverlay()
  } catch (error) {
    console.error('Error fetching reports:', error)
    errorMessage.value = 'Failed to load reports. Please try again.' as any
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
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    Toast.error('Failed to export to PDF: ' + error.message)
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
    safeGridApi.showLoadingOverlay()

    console.log('Consolidated Sheet component mounted')

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
    console.log('Fetching Consolidated Sheet for client:', clientId)

    // First load branch assignments
    console.log('Loading branch assignments for user:', userEmail)
    await loadAssignedBranches(userEmail)

    // Then fetch reports with branch filtering applied
    await fetchReports()
  } catch (error) {
    console.error('Error during component initialization:', error)
    errorMessage.value =
      'Failed to initialize component: ' +
      (error instanceof Error ? error.message : 'Unknown error')
    safeGridApi.showNoRowsOverlay()
  }
})

// Computed property to check if we have reports to consolidate
const hasFilteredReports = computed(() => {
  return displayReports.value.length > 0
})

// Function to generate Consolidated Sheet
const generateConsolidatedReports = () => {
  if (!hasFilteredReports.value) {
    Toast.error('No reports available to consolidate. Please adjust your filters.')
    return
  }

  // Show loading indicator
  loading.value = true

  try {
    // Use selected reports when available, otherwise use all displayed reports
    const reports = selectedRows.value.length > 0 ? selectedRows.value : displayReports.value

    // If using selected reports, show a message
    if (selectedRows.value.length > 0) {
      Toast.info(`Generating report for ${selectedRows.value.length} selected reports`)
    } else {
      Toast.info(`Generating report for all ${displayReports.value.length} filtered reports`)
    }

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
    const consolidatedResults = reports.map((report: any) => {
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
      if (report.content) {
        const content =
          typeof report.content === 'string' ? JSON.parse(report.content) : report.content

        // Store the raw content for accessing question scores
        result._rawContent = content
      }

      return result
    })

    // Generate section and question structure
    generateSectionAndQuestionStructure(reports)

    // Update consolidated data
    consolidatedData.value = consolidatedResults

    // Calculate overall stats
    const totalReports = reports.length
    const overallTotalScore = reports.reduce((sum, report: any) => {
      // Check if the report has a fatal error
      const hasFatalError = checkReportHasFatalError(report)
      // If fatal error, treat score as 0, otherwise use the actual score
      const reportScore = hasFatalError ? 0 : Number(report.total_score) || 0
      return sum + reportScore
    }, 0)
    const overallAverageScore = totalReports ? Math.round(overallTotalScore / totalReports) : 0

    // Update consolidated stats
    consolidatedStats.value = {
      totalReports,
      averageScore: overallAverageScore,
      dateRange: 'All Time'
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
    console.error('Error generating Consolidated Sheet:', error)
    Toast.error(
      'Failed to generate Consolidated Sheet' + (error.message ? ': ' + error.message : '')
    )
  } finally {
    loading.value = false
  }
}

// Helper function to extract sections and questions structure from reports
const generateSectionAndQuestionStructure = (reports: any[]) => {
  try {
    const sectionsMap = new Map()

    // Process all reports to extract unique sections and questions
    reports.forEach((report: any) => {
      const content =
        typeof report.content === 'string' ? JSON.parse(report.content) : report.content

      if (content?.reports && Array.isArray(content.reports)) {
        content.reports.forEach((section: any, sectionIndex: number) => {
          const sectionId = section.heading || `Section ${sectionIndex + 1}`

          if (!sectionsMap.has(sectionId)) {
            sectionsMap.set(sectionId, {
              id: sectionId,
              name: `Section ${sectionIndex + 1} - ${section.heading}`,
              questions: new Map()
            })
          }

          const sectionData = sectionsMap.get(sectionId)

          // Extract questions for this section
          if (section.data && Array.isArray(section.data)) {
            section.data.forEach((question: any, questionIndex: number) => {
              const questionId = question.question || `Question ${questionIndex + 1}`

              if (!sectionData.questions.has(questionId)) {
                sectionData.questions.set(questionId, {
                  id: questionId,
                  number: `${sectionIndex + 1}.${questionIndex + 1}`,
                  title: question.question || `Question ${questionIndex + 1}`
                })
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
      return '-'
    }

    // Find the section
    const section = report._rawContent.reports.find(
      (s: any) => s.heading === sectionId || s.id === sectionId
    )
    if (!section || !section.data) {
      return '-'
    }

    // Find the question
    const question = section.data.find((q: any) => q.question === questionId || q.id === questionId)
    if (!question) {
      return '-'
    }

    // Return the appropriate value
    if (valueType === 'applicable') {
      return question.applicable_score || '0'
    } else {
      return question.achieved_score || '0'
    }
  } catch (error) {
    console.error('Error getting question value:', error)
    return '-'
  }
}

// Calculate the total percentage score for a report
const getReportTotalPercentage = (report: any): number => {
  try {
    if (!report._rawContent || !report._rawContent.reports) {
      return 0
    }

    // Check if the report has a fatal error
    const hasFatalError = report._rawContent.reports.some((section: any) =>
      checkSectionFatalError(section)
    )
    if (hasFatalError) {
      return 0
    }

    let totalApplicable = 0
    let totalAchieved = 0

    // Loop through all sections and sum up scores (excluding fatal error sections)
    report._rawContent.reports.forEach((section: any) => {
      // Skip fatal error sections from calculation
      if (!isFatalErrorSection(section.heading || section.name)) {
      if (section.total_achieved_score !== undefined && section.total_applicable_score) {
        totalAchieved += parseFloat(section.total_achieved_score || 0)
        totalApplicable += parseFloat(section.total_applicable_score || 0)
        }
      }
    })

    // Calculate percentage if applicable score is not zero
    if (totalApplicable > 0) {
      return (totalAchieved / totalApplicable) * 100
    }

    return 0
  } catch (error) {
    console.error('Error calculating report total percentage:', error)
    return 0
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
      // Look for common date field names in selectedFieldValues
      console.log('content', content)
      if (content?.date) {
        return formatVisitDate(content.date)
      }
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

// Helper function to format visit time
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

// Calculate the section score percentage for a report
const getSectionScorePercentage = (report: any, sectionId: string): number => {
  try {
    if (!report._rawContent || !report._rawContent.reports) {
      return 0
    }

    // Find the section
    const section = report._rawContent.reports.find(
      (s: any) => s.heading === sectionId || s.id === sectionId
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
    const worksheet = workbook.addWorksheet('Consolidated Sheet')

    // Get all report information headers
    const dynamicHeaders = consolidatedTableHeaders.value

    // Add main section headers row
    const mainHeaderRow = worksheet.addRow([])

    // Add report info header spanning multiple columns
    mainHeaderRow.getCell(1).value = 'Report Information'
    // Merge report info cells based on number of headers
    if (dynamicHeaders.length > 1) {
      worksheet.mergeCells(mainHeaderRow.number, 1, mainHeaderRow.number, dynamicHeaders.length)
    }

    // Track column index after report info columns
    let colIndex = dynamicHeaders.length + 1

    // Add section headers
    consolidatedSections.value.forEach((section) => {
      mainHeaderRow.getCell(colIndex).value = section.name
      colIndex++
    })

    // Add total score header
    mainHeaderRow.getCell(colIndex).value = 'Total Score'

    // Style the main header row with custom colors
    for (let i = 1; i <= colIndex; i++) {
      const cell = mainHeaderRow.getCell(i)
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }

      if (i <= dynamicHeaders.length) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.reportInfoHeader }
        }
      } else if (i === colIndex) {
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

    // Add column headers row for each specific field
    const columnHeadersRow = worksheet.addRow([])

    // Add all report info column headers
    dynamicHeaders.forEach((header, index) => {
      columnHeadersRow.getCell(index + 1).value = header.display
    })

    // Reset column index to after the dynamic headers
    colIndex = dynamicHeaders.length + 1

    // Add section score headers
    consolidatedSections.value.forEach(() => {
      columnHeadersRow.getCell(colIndex).value = 'Score (%)'
      colIndex++
    })

    // Add overall score header
    columnHeadersRow.getCell(colIndex).value = 'Overall (%)'

    // Style the column headers with custom colors
    for (let i = 1; i <= colIndex; i++) {
      const cell = columnHeadersRow.getCell(i)
      cell.font = { bold: true }

      if (i <= dynamicHeaders.length) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelColorScheme.value.reportInfoBg }
        }
      } else if (i === colIndex) {
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

      // Add all report information fields
      dynamicHeaders.forEach((header, index) => {
        let cellValue = item[header.key] || ''

        // Special formatting for percentage fields
        if (header.key === 'overall_performance' || header.key === 'averageScore') {
          if (typeof cellValue === 'number') {
            // Keep as number for Excel formatting
            dataRow.getCell(index + 1).numFmt = '0.00"%"'
          } else if (typeof cellValue === 'string' && cellValue.endsWith('%')) {
            cellValue = parseFloat(cellValue.replace('%', '')) // Convert to number for Excel
            dataRow.getCell(index + 1).numFmt = '0.00"%"'
          }
        }

        dataRow.getCell(index + 1).value = cellValue
      })

      // Reset column index for section scores
      colIndex = dynamicHeaders.length + 1

      // Add section scores
      consolidatedSections.value.forEach((section) => {
        const scoreValue = getSectionScorePercentage(item, section.id)
        dataRow.getCell(colIndex).value = scoreValue
        dataRow.getCell(colIndex).numFmt = '0.00"%"'
        colIndex++
      })

      // Add total score
      const totalScore = getReportTotalPercentage(item)
      dataRow.getCell(colIndex).value = totalScore
      dataRow.getCell(colIndex).numFmt = '0.00"%"'

      // Style the data cells
      for (let i = 1; i <= colIndex; i++) {
        const cell = dataRow.getCell(i)

        // Align report info cells
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

        // Add conditional formatting for scores with custom colors
        if (i > dynamicHeaders.length) {
          const score = cell.value as number
          if (score >= 80) {
            cell.font = { color: { argb: excelColorScheme.value.highScore } }
          } else if (score >= 60) {
            cell.font = { color: { argb: excelColorScheme.value.mediumScore } }
          } else {
            cell.font = { color: { argb: excelColorScheme.value.lowScore } }
          }
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
        column.width = Math.min(Math.max(maxLength + 2, 12), 50)
      }
    })

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    FileSaver.saveAs(blob, `Consolidated_Sheet_${new Date().toISOString().split('T')[0]}.xlsx`)

    // Hide dialog and show success message
    showColorCustomizationDialog.value = false
    Toast.success('Consolidated Sheet exported successfully')
  } catch (error: any) {
    console.error('Error exporting consolidated results:', error)
    Toast.error('Failed to export consolidated results: ' + (error.message || 'Unknown error'))
  }
}

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
      (s: any) => s.heading === sectionId || s.id === sectionId
    )

    if (!section) {
      return '0'
    }

    // Return the requested value
    if (valueType === 'applicable') {
      return section.total_applicable_score?.toString() || '0'
    } else {
      return section.total_achieved_score?.toString() || '0'
    }
  } catch (error) {
    console.error(`Error getting section ${valueType} total:`, error)
    return '0'
  }
}

// Add color presets function after helper functions
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

// Add helper function to get Excel color scheme color based on score
const getScoreColor = (score: number): string => {
  if (score >= 80) return excelColorScheme.value.highScore
  if (score >= 60) return excelColorScheme.value.mediumScore
  return excelColorScheme.value.lowScore
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
    const emailFields: string[] = []

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
    const matchedBranches = branches.filter((branch: any) => {
      for (const field of emailFields) {
        if (!branch[field]) continue

        const fieldValue = String(branch[field]).toLowerCase()

        // Check exact match
        if (fieldValue === userLowerEmail) {
          console.log(
            `Found exact email match in field ${field} for branch:`,
            branch.branch_name || branch.branch_code || branch.id
          )
          return true
        }

        // Check comma/semicolon separated list
        if (fieldValue.includes(',') || fieldValue.includes(';')) {
          const emails = fieldValue.split(/[,;]/).map((e: string) => e.trim().toLowerCase())
          if (emails.includes(userLowerEmail)) {
            console.log(
              `Found email in list in field ${field} for branch:`,
              branch.branch_name || branch.branch_code || branch.id
            )
            return true
          }
        }

        // Check substring match as last resort
        if (fieldValue.includes(userLowerEmail)) {
          console.log(
            `Found partial email match in field ${field} for branch:`,
            branch.branch_name || branch.branch_code || branch.id
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
  } catch (error) {
    console.error('Error loading branch assignments:', error)
    assignedBranches.value = []
  }
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

const loads = ref(false)
watch(loading, (newValue) => {
  loads.value = newValue
})
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

/* Enhanced Color Customization Dialog Styles */
.color-customization-dialog {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
}

/* Preset Button Styles */
.preset-button {
  @apply relative p-4 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px solid transparent;
}

.preset-button:hover {
  border-color: rgba(255, 255, 255, 0.3);
}

.preset-name {
  font-size: 0.875rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.preset-colors {
  display: flex;
  gap: 4px;
  align-items: center;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Color Picker Group Styles */
.color-picker-group {
  @apply flex flex-col space-y-2;
}

.color-label {
  @apply text-sm font-medium text-gray-700 mb-1;
}

.color-picker-wrapper {
  @apply flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors;
}

.custom-color-picker {
  @apply w-8 h-8 rounded border-2 border-white shadow-sm cursor-pointer;
}

.color-preview {
  @apply w-6 h-6 rounded border-2 border-white shadow-sm;
}

.color-value {
  @apply text-xs text-gray-600 bg-white px-2 py-1 rounded border;
}

/* Excel Preview Table Styles */
.excel-preview-table {
  @apply border-collapse;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 0.875rem;
}

.excel-header-cell {
  @apply py-3 px-4 border border-gray-300 font-bold text-center text-white;
  background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.1));
}

.excel-subheader-cell {
  @apply py-2 px-3 border border-gray-300 font-medium text-center text-gray-700;
  background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.5), rgba(0, 0, 0, 0.05));
}

.excel-data-cell {
  @apply py-2 px-3 border border-gray-300 text-center;
  background-color: #ffffff;
}

.excel-data-cell:hover {
  background-color: #f8fafc;
}

/* Animation for color changes */
.color-picker-wrapper,
.excel-header-cell,
.excel-subheader-cell,
.excel-data-cell {
  transition: all 0.3s ease;
}

/* Responsive adjustments */
@media (max-width: 1280px) {
  .preset-button {
    min-height: 70px;
    padding: 12px;
  }

  .preset-name {
    font-size: 0.8rem;
  }

  .color-dot {
    width: 10px;
    height: 10px;
  }
}

@media (max-width: 768px) {
  .color-picker-wrapper {
    flex-direction: column;
    align-items: flex-start;
    space-y: 8px;
  }

  .excel-preview-table {
    font-size: 0.75rem;
  }

  .excel-header-cell,
  .excel-subheader-cell,
  .excel-data-cell {
    padding: 8px 6px;
  }
}

/* Custom scrollbar for preview */
.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
