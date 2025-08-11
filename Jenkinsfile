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
                sh '''
                    echo "Ensuring frontend BuildConfig exists..."
                    if ! oc get bc frontend --insecure-skip-tls-verify >/dev/null 2>&1; then
                        oc new-build --binary --name=frontend --strategy=docker --insecure-skip-tls-verify
                    fi

                    echo "Patching frontend BuildConfig to allow insecure registry..."
                    oc patch bc/frontend --type=merge -p '{"spec":{"strategy":{"dockerStrategy":{"insecure":true}},"output":{"insecure":true}}}' --insecure-skip-tls-verify

                    echo "Starting frontend build..."
                    oc start-build frontend --from-dir=frontend --wait --follow --insecure-skip-tls-verify
                '''
            }
        }

        stage('Build Backend Image with OpenShift') {
            steps {
                sh '''
                    echo "Ensuring backend BuildConfig exists..."
                    if ! oc get bc backend --insecure-skip-tls-verify >/dev/null 2>&1; then
                        oc new-build --binary --name=backend --strategy=docker --insecure-skip-tls-verify
                    fi

                    echo "Patching backend BuildConfig to allow insecure registry..."
                    oc patch bc/backend --type=merge -p '{"spec":{"strategy":{"dockerStrategy":{"insecure":true}},"output":{"insecure":true}}}' --insecure-skip-tls-verify

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
