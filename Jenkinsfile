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

        stage('Patch BuildConfigs to Use HTTP and Insecure') {
            steps {
                script {
                    // Patch frontend BuildConfig
                    sh '''
                        echo "Patching frontend BuildConfig for insecure and HTTP registry..."

                        # Patch insecure flags for build strategy and output
                        oc patch bc/frontend --type=merge -p '{"spec":{"strategy":{"dockerStrategy":{"insecure":true}},"output":{"insecure":true}}}' --insecure-skip-tls-verify

                        # Get current DockerStrategy from BuildConfig
                        DOCKERSTRATEGY=$(oc get bc/frontend -o jsonpath='{.spec.strategy.dockerStrategy.from.name}' --insecure-skip-tls-verify)

                        # Replace https:// with http:// if present
                        if echo "$DOCKERSTRATEGY" | grep -q '^https://'; then
                            NEWFROM=$(echo "$DOCKERSTRATEGY" | sed 's/^https:/http:/')
                            oc patch bc/frontend --type=json -p="[{'op':'replace','path':'/spec/strategy/dockerStrategy/from/name','value':'${NEWFROM}'}]" --insecure-skip-tls-verify
                            echo "Patched frontend dockerStrategy.from.name to use HTTP: $NEWFROM"
                        else
                            echo "No HTTPS prefix found in frontend dockerStrategy.from.name, no change needed"
                        fi
                    '''

                    // Patch backend BuildConfig
                    sh '''
                        echo "Patching backend BuildConfig for insecure and HTTP registry..."

                        oc patch bc/backend --type=merge -p '{"spec":{"strategy":{"dockerStrategy":{"insecure":true}},"output":{"insecure":true}}}' --insecure-skip-tls-verify

                        DOCKERSTRATEGY=$(oc get bc/backend -o jsonpath='{.spec.strategy.dockerStrategy.from.name}' --insecure-skip-tls-verify)

                        if echo "$DOCKERSTRATEGY" | grep -q '^https://'; then
                            NEWFROM=$(echo "$DOCKERSTRATEGY" | sed 's/^https:/http:/')
                            oc patch bc/backend --type=json -p="[{'op':'replace','path':'/spec/strategy/dockerStrategy/from/name','value':'${NEWFROM}'}]" --insecure-skip-tls-verify
                            echo "Patched backend dockerStrategy.from.name to use HTTP: $NEWFROM"
                        else
                            echo "No HTTPS prefix found in backend dockerStrategy.from.name, no change needed"
                        fi
                    '''
                }
            }
        }

        stage('Build Frontend Image with OpenShift') {
            steps {
                sh '''
                    echo "Starting frontend build..."
                    oc start-build frontend --from-dir=frontend --wait --follow --insecure-skip-tls-verify
                '''
            }
        }

        stage('Build Backend Image with OpenShift') {
            steps {
                sh '''
                    echo "Starting backend build..."
                    oc start-build backend --from-dir=backend --wait --follow --insecure-skip-tls-verify
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

                        echo "Pushing frontend..."
                        FRONTEND_LOCAL=$(oc get is frontend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}' --insecure-skip-tls-verify)
                        buildah pull --authfile /tmp/auth.json --tls-verify=false $FRONTEND_LOCAL
                        buildah tag $FRONTEND_LOCAL ${FRONTEND_IMAGE}
                        buildah push --authfile /tmp/auth.json --tls-verify=false ${FRONTEND_IMAGE}

                        echo "Pushing backend..."
                        BACKEND_LOCAL=$(oc get is backend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}' --insecure-skip-tls-verify)
                        buildah pull --authfile /tmp/auth.json --tls-verify=false $BACKEND_LOCAL
                        buildah tag $BACKEND_LOCAL ${BACKEND_IMAGE}
                        buildah push --authfile /tmp/auth.json --tls-verify=false ${BACKEND_IMAGE}
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
