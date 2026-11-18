# BPS SMART engine (C++17).
#
#   Native (tests):   cmake --preset native && cmake --build --preset native && ctest --preset native
#   WebAssembly:      cmake --preset wasm   && cmake --build --preset wasm      (needs $EMSDK)
#
# The WebAssembly build writes bps_engine.js + bps_engine.wasm to
# BPS_WASM_OUTPUT_DIR (default: frontend/public/wasm, served as /wasm/).
cmake_minimum_required(VERSION 3.21)
project(bps_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release)
endif()

get_filename_component(REPO_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/.." ABSOLUTE)
set(BPS_WASM_OUTPUT_DIR "${REPO_ROOT}/frontend/public/wasm" CACHE PATH "Where the WebAssembly build is written")
set(BPS_WASM_ENVIRONMENT "web,worker" CACHE STRING "Emscripten -sENVIRONMENT (add node for Node.js tests)")

# --- Version header, regenerated on every build ------------------------------
set(BPS_GENERATED_DIR "${CMAKE_CURRENT_BINARY_DIR}/generated")
set(BPS_VERSION_HEADER "${BPS_GENERATED_DIR}/bps/version.hpp")
add_custom_target(bps_version
  COMMAND "${CMAKE_COMMAND}" "-DREPO_ROOT=${REPO_ROOT}" "-DOUTPUT=${BPS_VERSION_HEADER}"
          -P "${CMAKE_CURRENT_SOURCE_DIR}/cmake/GenerateVersion.cmake"
  BYPRODUCTS "${BPS_VERSION_HEADER}"
  COMMENT "Generating bps/version.hpp"
  VERBATIM)

# --- Core library: everything except the JS bindings -------------------------
add_library(bps_core STATIC src/json.cpp src/rao.cpp src/envelope.cpp src/engine.cpp)
target_include_directories(bps_core PUBLIC include PRIVATE "${BPS_GENERATED_DIR}")
add_dependencies(bps_core bps_version)
if(MSVC)
  target_compile_options(bps_core PRIVATE /W4 /utf-8)
else()
  target_compile_options(bps_core PRIVATE -Wall -Wextra -Wpedantic)
endif()

if(EMSCRIPTEN)
  # Needed so catch(...) in engine.cpp isolates a failing file instead of aborting.
  target_compile_options(bps_core PUBLIC -fexceptions)

  add_executable(bps_engine src/bindings.cpp)
  target_link_libraries(bps_engine PRIVATE bps_core)
  target_link_options(bps_engine PRIVATE
    -lembind
    -fexceptions
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sEXPORT_NAME=createBpsEngine
    "-sENVIRONMENT=${BPS_WASM_ENVIRONMENT}"
    -sALLOW_MEMORY_GROWTH=1
    -sFILESYSTEM=0)
  set_target_properties(bps_engine PROPERTIES
    SUFFIX ".js"
    RUNTIME_OUTPUT_DIRECTORY "${BPS_WASM_OUTPUT_DIR}")
else()
  enable_testing()

  add_executable(bps_tests tests/test_engine.cpp)
  target_link_libraries(bps_tests PRIVATE bps_core)
  target_include_directories(bps_tests PRIVATE "${BPS_GENERATED_DIR}")
  if(MINGW)
    # Avoid picking up another MinGW's libstdc++ DLL from PATH (e.g. Git's).
    target_link_options(bps_tests PRIVATE -static)
  endif()
  add_test(NAME engine COMMAND bps_tests "${CMAKE_CURRENT_SOURCE_DIR}/tests/data")

  add_test(NAME version_script
    COMMAND "${CMAKE_COMMAND}"
            "-DREPO_ROOT=${REPO_ROOT}"
            "-DSCRIPT=${CMAKE_CURRENT_SOURCE_DIR}/cmake/GenerateVersion.cmake"
            "-DWORK_DIR=${CMAKE_CURRENT_BINARY_DIR}"
            -P "${CMAKE_CURRENT_SOURCE_DIR}/tests/TestGenerateVersion.cmake")
endif()
