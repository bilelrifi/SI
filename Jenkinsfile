pipeline {
    agent any

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"
        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Logging into OpenShift..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Logged into OpenShift project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Build Frontend Image with OpenShift') {
            steps {
                script {
                    retry(3) {
                        sh '''
                            echo "Ensuring frontend BuildConfig exists..."
                            if ! oc get bc frontend --insecure-skip-tls-verify >/dev/null 2>&1; then
                                oc new-build --binary --name=frontend --strategy=docker --insecure-skip-tls-verify
                            fi

                            echo "Patching frontend BuildConfig to allow insecure registry..."
                            oc patch bc/frontend --type=merge -p '{"spec":{"strategy":{"dockerStrategy":{"insecure":true}}}}' --insecure-skip-tls-verify

                            echo "Starting frontend build with enhanced error handling..."
                            
                            # Method 1: Try with additional TLS bypass options
                            if ! oc start-build frontend --from-dir=frontend --wait --follow --insecure-skip-tls-verify --loglevel=10; then
                                echo "Build failed with follow, trying without follow..."
                                
                                # Method 2: Start build without follow and monitor separately
                                BUILD_NAME=$(oc start-build frontend --from-dir=frontend --insecure-skip-tls-verify -o name | cut -d'/' -f2)
                                echo "Started build: $BUILD_NAME"
                                
                                # Wait for build to complete
                                echo "Waiting for build to complete..."
                                oc wait --for=condition=Complete build/$BUILD_NAME --timeout=600s --insecure-skip-tls-verify || \
                                oc wait --for=condition=Failed build/$BUILD_NAME --timeout=600s --insecure-skip-tls-verify
                                
                                # Check build status
                                BUILD_STATUS=$(oc get build/$BUILD_NAME -o jsonpath='{.status.phase}' --insecure-skip-tls-verify)
                                echo "Build status: $BUILD_STATUS"
                                
                                if [ "$BUILD_STATUS" != "Complete" ]; then
                                    echo "Build failed or timed out"
                                    oc logs build/$BUILD_NAME --insecure-skip-tls-verify || true
                                    exit 1
                                fi
                            fi
                            
                            echo "Frontend build completed successfully"
                        '''
                    }
                }
            }
        }

        stage('Build Backend Image with OpenShift') {
            steps {
                script {
                    retry(3) {
                        sh '''
                            echo "Ensuring backend BuildConfig exists..."
                            if ! oc get bc backend --insecure-skip-tls-verify >/dev/null 2>&1; then
                                oc new-build --binary --name=backend --strategy=docker --insecure-skip-tls-verify
                            fi

                            echo "Patching backend BuildConfig to allow insecure registry..."
                            oc patch bc/backend --type=merge -p '{"spec":{"strategy":{"dockerStrategy":{"insecure":true}}}}' --insecure-skip-tls-verify

                            echo "Starting backend build with enhanced error handling..."
                            
                            # Method 1: Try with additional TLS bypass options
                            if ! oc start-build backend --from-dir=backend --wait --follow --insecure-skip-tls-verify --loglevel=10; then
                                echo "Build failed with follow, trying without follow..."
                                
                                # Method 2: Start build without follow and monitor separately
                                BUILD_NAME=$(oc start-build backend --from-dir=backend --insecure-skip-tls-verify -o name | cut -d'/' -f2)
                                echo "Started build: $BUILD_NAME"
                                
                                # Wait for build to complete
                                echo "Waiting for build to complete..."
                                oc wait --for=condition=Complete build/$BUILD_NAME --timeout=600s --insecure-skip-tls-verify || \
                                oc wait --for=condition=Failed build/$BUILD_NAME --timeout=600s --insecure-skip-tls-verify
                                
                                # Check build status
                                BUILD_STATUS=$(oc get build/$BUILD_NAME -o jsonpath='{.status.phase}' --insecure-skip-tls-verify)
                                echo "Build status: $BUILD_STATUS"
                                
                                if [ "$BUILD_STATUS" != "Complete" ]; then
                                    echo "Build failed or timed out"
                                    oc logs build/$BUILD_NAME --insecure-skip-tls-verify || true
                                    exit 1
                                fi
                            fi
                            
                            echo "Backend build completed successfully"
                        '''
                    }
                }
            }
        }

        stage('Push to Quay.io') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    script {
                        retry(2) {
                            sh '''
                                echo "Logging into Quay.io..."
                                oc registry login --to=/tmp/auth.json --insecure-skip-tls-verify
                                buildah login -u $QUAY_USER -p $QUAY_PASS quay.io --tls-verify=false

                                echo "Pushing frontend..."
                                FRONTEND_LOCAL=$(oc get is frontend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}' --insecure-skip-tls-verify)
                                if [ -z "$FRONTEND_LOCAL" ]; then
                                    echo "Error: Could not get frontend image reference"
                                    exit 1
                                fi
                                buildah pull --authfile /tmp/auth.json --tls-verify=false $FRONTEND_LOCAL
                                buildah tag $FRONTEND_LOCAL ${FRONTEND_IMAGE}
                                buildah push --authfile /tmp/auth.json --tls-verify=false ${FRONTEND_IMAGE}

                                echo "Pushing backend..."
                                BACKEND_LOCAL=$(oc get is backend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}' --insecure-skip-tls-verify)
                                if [ -z "$BACKEND_LOCAL" ]; then
                                    echo "Error: Could not get backend image reference"
                                    exit 1
                                fi
                                buildah pull --authfile /tmp/auth.json --tls-verify=false $BACKEND_LOCAL
                                buildah tag $BACKEND_LOCAL ${BACKEND_IMAGE}
                                buildah push --authfile /tmp/auth.json --tls-verify=false ${BACKEND_IMAGE}
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Deploying apps to OpenShift..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        oc delete all -l app=job-frontend --insecure-skip-tls-verify || true
                        oc delete all -l app=job-backend --insecure-skip-tls-verify || true

                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend --insecure-skip-tls-verify
                        oc expose svc/job-frontend --insecure-skip-tls-verify

                        oc new-app ${BACKEND_IMAGE} --name=job-backend --insecure-skip-tls-verify
                        oc expose svc/job-backend --insecure-skip-tls-verify
                    '''
                }
            }
        }
    }
}