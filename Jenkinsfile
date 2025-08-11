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

        stage('Patch BuildConfigs to Use HTTP') {
            steps {
                script {
                    // Function to patch a BC if it exists
                    def patchBC = { bcName ->
                        sh """
                            if oc get bc/${bcName} --insecure-skip-tls-verify >/dev/null 2>&1; then
                                echo "Checking ${bcName} BuildConfig for HTTPS registry..."
                                DOCKERSTRATEGY=\$(oc get bc/${bcName} -o jsonpath='{.spec.strategy.dockerStrategy.from.name}' --insecure-skip-tls-verify)

                                if echo "\$DOCKERSTRATEGY" | grep -q '^https://'; then
                                    NEWFROM=\$(echo "\$DOCKERSTRATEGY" | sed 's|^https:|http:|')
                                    oc patch bc/${bcName} --type=json -p="[{'op':'replace','path':'/spec/strategy/dockerStrategy/from/name','value':'\${NEWFROM}'}]" --insecure-skip-tls-verify
                                    echo "Patched ${bcName} dockerStrategy.from.name to use HTTP: \$NEWFROM"
                                else
                                    echo "No HTTPS prefix found in ${bcName}, skipping"
                                fi
                            else
                                echo "BuildConfig ${bcName} does not exist, skipping"
                            fi
                        """
                    }

                    patchBC("frontend")
                    patchBC("backend")
                }
            }
        }

        stage('Build Frontend Image with OpenShift') {
            steps {
                sh '''
                    if oc get bc/frontend --insecure-skip-tls-verify >/dev/null 2>&1; then
                        echo "Starting frontend build..."
                        oc start-build frontend --from-dir=frontend --wait --follow --insecure-skip-tls-verify
                    else
                        echo "Frontend BuildConfig missing, skipping build."
                    fi
                '''
            }
        }

        stage('Build Backend Image with OpenShift') {
            steps {
                sh '''
                    if oc get bc/backend --insecure-skip-tls-verify >/dev/null 2>&1; then
                        echo "Starting backend build..."
                        oc start-build backend --from-dir=backend --wait --follow --insecure-skip-tls-verify
                    else
                        echo "Backend BuildConfig missing, skipping build."
                    fi
                '''
            }
        }

        stage('Push to Quay.io') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh '''
                        echo "Logging into Quay.io..."
                        oc registry login --to=/tmp/auth.json --insecure-skip-tls-verify
                        buildah login -u $QUAY_USER -p $QUAY_PASS quay.io --tls-verify=false

                        if oc get is frontend --insecure-skip-tls-verify >/dev/null 2>&1; then
                            echo "Pushing frontend..."
                            FRONTEND_LOCAL=$(oc get is frontend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}' --insecure-skip-tls-verify)
                            buildah pull --authfile /tmp/auth.json --tls-verify=false $FRONTEND_LOCAL
                            buildah tag $FRONTEND_LOCAL ${FRONTEND_IMAGE}
                            buildah push --authfile /tmp/auth.json --tls-verify=false ${FRONTEND_IMAGE}
                        fi

                        if oc get is backend --insecure-skip-tls-verify >/dev/null 2>&1; then
                            echo "Pushing backend..."
                            BACKEND_LOCAL=$(oc get is backend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}' --insecure-skip-tls-verify)
                            buildah pull --authfile /tmp/auth.json --tls-verify=false $BACKEND_LOCAL
                            buildah tag $BACKEND_LOCAL ${BACKEND_IMAGE}
                            buildah push --authfile /tmp/auth.json --tls-verify=false ${BACKEND_IMAGE}
                        fi
                    '''
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

                        if oc get is frontend --insecure-skip-tls-verify >/dev/null 2>&1; then
                            oc delete all -l app=job-frontend --insecure-skip-tls-verify || true
                            oc new-app ${FRONTEND_IMAGE} --name=job-frontend --insecure-skip-tls-verify
                            oc expose svc/job-frontend --insecure-skip-tls-verify
                        fi

                        if oc get is backend --insecure-skip-tls-verify >/dev/null 2>&1; then
                            oc delete all -l app=job-backend --insecure-skip-tls-verify || true
                            oc new-app ${BACKEND_IMAGE} --name=job-backend --insecure-skip-tls-verify
                            oc expose svc/job-backend --insecure-skip-tls-verify
                        fi
                    '''
                }
            }
        }
    }
}
