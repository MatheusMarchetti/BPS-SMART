cmake_policy(VERSION 3.21)

# VERCEL_GIT_COMMIT_SHA must win over git and be shortened to 7 characters.
set(out "${WORK_DIR}/version_script_test.hpp")
execute_process(
  COMMAND "${CMAKE_COMMAND}" -E env VERCEL_GIT_COMMIT_SHA=abcdef1234567890
          "${CMAKE_COMMAND}" "-DREPO_ROOT=${REPO_ROOT}" "-DOUTPUT=${out}" -P "${SCRIPT}"
  RESULT_VARIABLE rc)
if(NOT rc EQUAL 0)
  message(FATAL_ERROR "GenerateVersion.cmake failed (${rc})")
endif()

file(READ "${out}" content)
if(NOT content MATCHES "#define BPS_COMMIT \"abcdef1\"")
  message(FATAL_ERROR "Expected commit abcdef1, got:\n${content}")
endif()
if(NOT content MATCHES "#define BPS_SEMVER \"[0-9]+\\.[0-9]+\\.[0-9]+\"")
  message(FATAL_ERROR "Unexpected semver:\n${content}")
endif()
